import type { TransactionHash } from '@ghostguard/shared'

export interface RpcLog {
  address: string
  topics: string[]
  data: string
  logIndex: string
}

export interface RpcFilterLog extends RpcLog {
  transactionHash: string
  blockNumber: string
}

export interface RpcLogFilter {
  fromBlock: bigint
  toBlock: bigint
  topics: Array<string | string[] | null>
}

export interface RpcReceipt {
  transactionHash: string
  blockNumber: string | null
  status: string | null
  logs: RpcLog[]
}

export interface EthereumRpc {
  getChainId(): Promise<number>
  getTransactionReceipt(transactionHash: TransactionHash): Promise<RpcReceipt | null>
}

export interface WatchRpc extends EthereumRpc {
  getBlockNumber(): Promise<bigint>
  getLogs(filter: RpcLogFilter): Promise<RpcFilterLog[]>
}

export class RpcUnavailableError extends Error {
  override readonly name = 'RpcUnavailableError'

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
  }
}

interface JsonRpcEnvelope<T> {
  result?: T
  error?: { code?: number; message?: string }
}

export class JsonRpcClient implements EthereumRpc {
  private requestId = 0
  private readonly url: string
  private readonly timeoutMs: number
  private readonly fetcher: typeof fetch

  constructor(url: string, timeoutMs: number, fetcher: typeof fetch = fetch) {
    this.url = url
    this.timeoutMs = timeoutMs
    this.fetcher = fetcher
  }

  async getChainId(): Promise<number> {
    const result = await this.request<string>('eth_chainId', [])
    const chainId = Number.parseInt(result, 16)
    if (!Number.isSafeInteger(chainId) || chainId < 1) {
      throw new RpcUnavailableError('RPC returned an invalid chain ID.')
    }
    return chainId
  }

  async getTransactionReceipt(transactionHash: TransactionHash): Promise<RpcReceipt | null> {
    const receipt = await this.request<unknown>('eth_getTransactionReceipt', [transactionHash])
    if (receipt === null) return null
    if (!isRpcReceipt(receipt)) {
      throw new RpcUnavailableError('Monad RPC returned an invalid transaction receipt.')
    }
    return receipt
  }

  async getBlockNumber(): Promise<bigint> {
    const result = await this.request<string>('eth_blockNumber', [])
    return parseHexQuantity(result, 'block number')
  }

  async getLogs(filter: RpcLogFilter): Promise<RpcFilterLog[]> {
    const logs = await this.request<unknown>('eth_getLogs', [{
      fromBlock: toHexQuantity(filter.fromBlock),
      toBlock: toHexQuantity(filter.toBlock),
      topics: filter.topics,
    }])
    if (!Array.isArray(logs) || !logs.every(isRpcFilterLog)) {
      throw new RpcUnavailableError('Monad RPC returned invalid log data.')
    }
    return logs
  }

  private async request<T>(method: string, params: unknown[]): Promise<T> {
    let response: Response

    try {
      response = await this.fetcher(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: ++this.requestId,
          method,
          params,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch (cause) {
      throw new RpcUnavailableError('Unable to reach the configured Monad RPC endpoint.', { cause })
    }

    if (!response.ok) {
      throw new RpcUnavailableError(`Monad RPC returned HTTP ${response.status}.`)
    }

    let payload: JsonRpcEnvelope<T>
    try {
      payload = await response.json() as JsonRpcEnvelope<T>
    } catch (cause) {
      throw new RpcUnavailableError('Monad RPC returned invalid JSON.', { cause })
    }

    if (payload.error) {
      throw new RpcUnavailableError(`Monad RPC error: ${payload.error.message ?? 'unknown error'}`)
    }

    if (!Object.hasOwn(payload, 'result')) {
      throw new RpcUnavailableError('Monad RPC response did not include a result.')
    }

    return payload.result as T
  }
}

function isRpcReceipt(value: unknown): value is RpcReceipt {
  if (!isRecord(value)) return false
  if (typeof value.transactionHash !== 'string') return false
  if (value.blockNumber !== null && typeof value.blockNumber !== 'string') return false
  if (value.status !== null && typeof value.status !== 'string') return false
  if (!Array.isArray(value.logs)) return false

  return value.logs.every((log) => {
    if (!isRecord(log)) return false
    return typeof log.address === 'string'
      && Array.isArray(log.topics)
      && log.topics.every((topic) => typeof topic === 'string')
      && typeof log.data === 'string'
      && typeof log.logIndex === 'string'
  })
}

function isRpcFilterLog(value: unknown): value is RpcFilterLog {
  if (!isRecord(value)) return false
  return typeof value.address === 'string'
    && Array.isArray(value.topics)
    && value.topics.every((topic) => typeof topic === 'string')
    && typeof value.data === 'string'
    && typeof value.logIndex === 'string'
    && typeof value.transactionHash === 'string'
    && typeof value.blockNumber === 'string'
}

function parseHexQuantity(value: string, label: string): bigint {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) throw new RpcUnavailableError(`Monad RPC returned an invalid ${label}.`)
  return BigInt(value)
}

function toHexQuantity(value: bigint): string {
  if (value < 0n) throw new Error('Block quantity cannot be negative.')
  return `0x${value.toString(16)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
