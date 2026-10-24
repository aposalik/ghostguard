import type { TransactionHash } from '@ghostguard/shared'

export interface RpcLog {
  address: string
  topics: string[]
  data: string
  logIndex: string
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
