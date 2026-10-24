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

export type AccountActivityDirection = 'INCOMING' | 'OUTGOING' | 'SELF'
export type AccountActivityKind = 'NATIVE_TRANSFER' | 'CONTRACT_CALL' | 'TOKEN_TRANSFER'
export type AccountActivityVerdict = 'CONFIRMED' | 'SUSPICIOUS' | 'NEEDS_REVIEW' | 'REVERTED'

export interface MonitoredAccount {
  chainId: number
  address: HexAddress
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface AccountActivity {
  /** Stable identity scoped to the watched account and on-chain evidence source. */
  id: string
  chainId: number
  watchedAddress: HexAddress
  transactionHash: TransactionHash
  blockNumber: string
  direction: AccountActivityDirection
  kind: AccountActivityKind
  verdict: AccountActivityVerdict
  counterpartyAddress: HexAddress | null
  /** Token emitter for token transfers; null for native transfers and contract calls. */
  assetAddress: HexAddress | null
  /** Base-unit quantity serialized as an unsigned decimal string. */
  amount: string
  /** Present when receipt log evidence was analyzed by GhostGuard. */
  finding: SecurityFinding | null
  observedAt: string
}

export interface AccountActivitiesPage {
  items: AccountActivity[]
  nextCursor: string | null
}

export interface HealthResponse {
  status: 'ok' | 'degraded'
  chainId: number
  latestIndexedBlock: string | null
}

export type AgentState = 'disabled' | 'starting' | 'running' | 'stopped' | 'error' | 'budget_exhausted'

export interface ProducerAgentStatus {
  enabled: boolean
  state: AgentState
  ratePerSecond: number
  maxTransactions: number
  suspiciousEvery: number
  submitted: number
  normalSubmitted: number
  suspiciousSubmitted: number
  failed: number
  lastTransactionHash: TransactionHash | null
  lastActivityAt: string | null
  lastError: string | null
}

export interface DetectorAgentStatus {
  enabled: boolean
  state: AgentState
  emailNotificationsEnabled: boolean
  monitoredWalletCount: number
  pollIntervalMs: number
  cyclesCompleted: number
  logsObserved: number
  findingsStored: number
  alertsDelivered: number
  lastActivityAt: string | null
  lastError: string | null
}

export interface AgentStatusResponse {
  producer: ProducerAgentStatus
  detector: DetectorAgentStatus
}

export interface ApiErrorResponse {
  error: {
    code:
      | 'INVALID_REQUEST'
      | 'INVALID_ACCOUNT_ADDRESS'
      | 'INVALID_TRANSACTION_HASH'
      | 'TRANSACTION_NOT_FOUND'
      | 'RPC_UNAVAILABLE'
      | 'INTERNAL_ERROR'
    message: string
    requestId: string
  }
}
