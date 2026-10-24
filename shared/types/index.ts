export type HexAddress = `0x${string}`
export type TransactionHash = `0x${string}`

export const CLASSIFICATIONS = [
  'VERIFIED_DEMO_TRANSFER',
  'SUSPICIOUS_EVENT',
  'NEEDS_REVIEW',
  'FAILED_TRANSACTION',
  'PENDING',
] as const

export type Classification = (typeof CLASSIFICATIONS)[number]

export interface ClaimedTransfer {
  from: HexAddress
  to: HexAddress
  /** Base-unit quantity serialized as an unsigned decimal string. */
  amount: string
}

export interface VerificationCheck {
  code:
    | 'RECEIPT_SUCCESS'
    | 'EXPECTED_EMITTER'
    | 'TRANSFER_LOG_DECODED'
    | 'TOKEN_STATE_SUPPORTS_CLAIM'
  label: string
  outcome: 'PASS' | 'FAIL' | 'UNKNOWN'
  detail: string
}

export interface SecurityFinding {
  /** Stable identity: `${chainId}:${transactionHash}:${logIndex}`. */
  id: string
  chainId: number
  transactionHash: TransactionHash
  logIndex: number
  blockNumber: string
  classification: Classification
  actualEmitterAddress: HexAddress
  expectedTokenAddress: HexAddress | null
  claimedTransfer: ClaimedTransfer | null
  checks: VerificationCheck[]
  explanation: string
  analyzedAt: string
}

export interface TransactionSummary {
  chainId: number
  transactionHash: TransactionHash
  receiptStatus: 'SUCCESS' | 'REVERTED' | 'PENDING'
  blockNumber: string | null
}

export interface AnalyzeTransactionRequest {
  transactionHash: TransactionHash
  expectedTokenAddress?: HexAddress
}

export interface AnalyzeTransactionResponse {
  transaction: TransactionSummary
  findings: SecurityFinding[]
}

export interface FindingsPage {
  items: SecurityFinding[]
  nextCursor: string | null
}

export interface HealthResponse {
  status: 'ok' | 'degraded'
  chainId: number
  latestIndexedBlock: string | null
}

export interface ApiErrorResponse {
  error: {
    code:
      | 'INVALID_REQUEST'
      | 'INVALID_TRANSACTION_HASH'
      | 'TRANSACTION_NOT_FOUND'
      | 'RPC_UNAVAILABLE'
      | 'INTERNAL_ERROR'
    message: string
    requestId: string
  }
}
