import type {
  AnalyzeTransactionRequest,
  AnalyzeTransactionResponse,
  Classification,
  ClaimedTransfer,
  HealthResponse,
  HexAddress,
  SecurityFinding,
  VerificationCheck,
} from '@ghostguard/shared'
import { TransactionNotFoundError } from './errors.js'
import type { EthereumRpc, RpcLog, RpcReceipt } from '../watcher/rpc.js'

export const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/
const DATA_WORD_PATTERN = /^0x[a-fA-F0-9]{64}$/
const TOPIC_WORD_PATTERN = /^0x[a-fA-F0-9]{64}$/

export interface AnalysisService {
  health(): Promise<HealthResponse>
  analyze(request: AnalyzeTransactionRequest): Promise<AnalyzeTransactionResponse>
}

export interface AnalyzerOptions {
  trustedDemoTokenAddress?: HexAddress
  demoEventOnlyAddress?: HexAddress
  now?: () => Date
}

export class TransactionAnalyzer implements AnalysisService {
  private readonly rpc: EthereumRpc
  private readonly trustedToken?: HexAddress
  private readonly eventOnlyContract?: HexAddress
  private readonly now: () => Date

  constructor(rpc: EthereumRpc, options: AnalyzerOptions = {}) {
    this.rpc = rpc
    this.trustedToken = normalizeOptionalAddress(options.trustedDemoTokenAddress)
    this.eventOnlyContract = normalizeOptionalAddress(options.demoEventOnlyAddress)
    this.now = options.now ?? (() => new Date())
  }

  async health(): Promise<HealthResponse> {
    try {
      return {
        status: 'ok',
        chainId: await this.rpc.getChainId(),
        latestIndexedBlock: null,
      }
    } catch {
      return {
        status: 'degraded',
        chainId: 0,
        latestIndexedBlock: null,
      }
    }
  }

  async analyze(request: AnalyzeTransactionRequest): Promise<AnalyzeTransactionResponse> {
    const [chainId, receipt] = await Promise.all([
      this.rpc.getChainId(),
      this.rpc.getTransactionReceipt(request.transactionHash),
    ])

    if (!receipt) throw new TransactionNotFoundError()

    const receiptStatus = parseReceiptStatus(receipt)
    const blockNumber = receipt.blockNumber ? hexQuantityToDecimal(receipt.blockNumber) : null

    return {
      transaction: {
        chainId,
        transactionHash: request.transactionHash,
        receiptStatus,
        blockNumber,
      },
      findings: receiptStatus === 'SUCCESS'
        ? receipt.logs
            .filter(isTransferShapedLog)
            .map((log) => this.toFinding(chainId, request, receipt, log))
        : [],
    }
  }

  private toFinding(
    chainId: number,
    request: AnalyzeTransactionRequest,
    receipt: RpcReceipt,
    log: RpcLog,
  ): SecurityFinding {
    const emitter = normalizeAddress(log.address)
    const logIndex = hexQuantityToSafeNumber(log.logIndex, 'log index')
    const blockNumber = receipt.blockNumber ? hexQuantityToDecimal(receipt.blockNumber) : '0'
    const claimedTransfer = decodeTransfer(log)
    const expectedToken = this.trustedToken ?? normalizeOptionalAddress(request.expectedTokenAddress) ?? null
    const classification = classify({
      emitter,
      claimedTransfer,
      trustedToken: this.trustedToken,
      eventOnlyContract: this.eventOnlyContract,
    })

    return {
      id: `${chainId}:${request.transactionHash}:${logIndex}`,
      chainId,
      transactionHash: request.transactionHash,
      logIndex,
      blockNumber,
      classification,
      actualEmitterAddress: emitter,
      expectedTokenAddress: expectedToken,
      claimedTransfer,
      checks: buildChecks(emitter, expectedToken, claimedTransfer),
      explanation: explain(classification),
      analyzedAt: this.now().toISOString(),
    }
  }
}

function isTransferShapedLog(log: RpcLog): boolean {
  return log.topics[0]?.toLowerCase() === TRANSFER_TOPIC
}

function decodeTransfer(log: RpcLog): ClaimedTransfer | null {
  const fromTopic = log.topics[1]
  const toTopic = log.topics[2]
  if (!fromTopic || !toTopic) return null
  if (!TOPIC_WORD_PATTERN.test(fromTopic) || !TOPIC_WORD_PATTERN.test(toTopic)) return null
  if (!DATA_WORD_PATTERN.test(log.data)) return null

  return {
    from: topicToAddress(fromTopic),
    to: topicToAddress(toTopic),
    amount: BigInt(log.data).toString(10),
  }
}

function classify(input: {
  emitter: HexAddress
  claimedTransfer: ClaimedTransfer | null
  trustedToken?: HexAddress
  eventOnlyContract?: HexAddress
}): Classification {
  if (!input.claimedTransfer) return 'NEEDS_REVIEW'
  if (input.trustedToken && input.emitter === input.trustedToken) return 'VERIFIED_DEMO_TRANSFER'
  if (input.eventOnlyContract && input.emitter === input.eventOnlyContract) return 'SUSPICIOUS_EVENT'
  return 'NEEDS_REVIEW'
}

function buildChecks(
  emitter: HexAddress,
  expectedToken: HexAddress | null,
  claimedTransfer: ClaimedTransfer | null,
): VerificationCheck[] {
  return [
    {
      code: 'RECEIPT_SUCCESS',
      label: 'Receipt status',
      outcome: 'PASS',
      detail: 'The transaction receipt reports success.',
    },
    {
      code: 'EXPECTED_EMITTER',
      label: 'Expected emitter',
      outcome: expectedToken ? (emitter === expectedToken ? 'PASS' : 'FAIL') : 'UNKNOWN',
      detail: expectedToken
        ? (emitter === expectedToken
            ? 'The log emitter matches the configured trusted token.'
            : 'The log emitter does not match the configured trusted token.')
        : 'No trusted token address is configured.',
    },
    {
      code: 'TRANSFER_LOG_DECODED',
      label: 'Transfer log decoded',
      outcome: claimedTransfer ? 'PASS' : 'FAIL',
      detail: claimedTransfer
        ? 'Indexed from/to topics and uint256 amount decoded successfully.'
        : 'The event signature matched, but the indexed fields or amount were malformed.',
    },
    {
      code: 'TOKEN_STATE_SUPPORTS_CLAIM',
      label: 'Token state evidence',
      outcome: 'UNKNOWN',
      detail: 'Balance-delta verification is not implemented in this backend phase.',
    },
  ]
}

function explain(classification: Classification): string {
  switch (classification) {
    case 'VERIFIED_DEMO_TRANSFER':
      return 'The receipt succeeded and the Transfer log was emitted by the configured DemoToken contract.'
    case 'SUSPICIOUS_EVENT':
      return 'The receipt succeeded, but the Transfer-shaped log was emitted by the configured event-only demo contract rather than DemoToken.'
    case 'NEEDS_REVIEW':
      return 'A Transfer-shaped log was found, but the configured evidence is insufficient for a verified or suspicious-demo classification.'
    case 'FAILED_TRANSACTION':
      return 'The transaction reverted; no successful token transfer was verified.'
    case 'PENDING':
      return 'The transaction receipt is not final yet.'
  }
}

function parseReceiptStatus(receipt: RpcReceipt): 'SUCCESS' | 'REVERTED' | 'PENDING' {
  if (receipt.status === '0x1') return 'SUCCESS'
  if (receipt.status === '0x0') return 'REVERTED'
  return 'PENDING'
}

function topicToAddress(topic: string): HexAddress {
  return `0x${topic.slice(-40).toLowerCase()}` as HexAddress
}

function normalizeOptionalAddress(value: string | undefined): HexAddress | undefined {
  return value ? normalizeAddress(value) : undefined
}

function normalizeAddress(value: string): HexAddress {
  if (!ADDRESS_PATTERN.test(value)) throw new Error('RPC returned an invalid log emitter address.')
  return value.toLowerCase() as HexAddress
}

function hexQuantityToDecimal(value: string): string {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) throw new Error('RPC returned an invalid hex quantity.')
  return BigInt(value).toString(10)
}

function hexQuantityToSafeNumber(value: string, label: string): number {
  const decimal = BigInt(hexQuantityToDecimal(value))
  if (decimal > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`RPC ${label} exceeds the safe integer range.`)
  return Number(decimal)
}
