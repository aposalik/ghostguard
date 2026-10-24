import type { AnalyzeTransactionResponse, SecurityFinding } from '@ghostguard/shared'

export interface DemoScenario {
  id: string
  name: string
  tag: string
  description: string
  transactionHash: `0x${string}`
  response: AnalyzeTransactionResponse
}

export const DEMO_TOKEN_ADDRESS = '0x21a48a0f107baf3dc2eda13e4ab6b7e624397639' as const
export const DECOY_EMITTER_ADDRESS = '0xa7836d1245593d16929a3eea3aa34461ef08f474' as const

const FROM_ADDRESS = '0x72a319e6ff8a30a8a524c8559df185164409b9bd' as const
const TO_ADDRESS = '0x07eeaf6bb355fa538eb69df7a3fdd6c81e3807fb' as const
const AMOUNT = '25000000000000000000'

export const SCENARIO_A_LEGITIMATE: DemoScenario = {
  id: 'scenario-a',
  name: 'Scenario A: Legitimate Transfer',
  tag: 'Verified',
  description: 'Recorded real DemoToken transfer on Monad Testnet with a matching emitter.',
  transactionHash: '0x22b9eb3a62f096515a44a319fc119ea4411c1fb3c2652915497ecd4df57f6d1f',
  response: {
    transaction: {
      chainId: 10143,
      transactionHash: '0x22b9eb3a62f096515a44a319fc119ea4411c1fb3c2652915497ecd4df57f6d1f',
      receiptStatus: 'SUCCESS',
      blockNumber: '73787274',
    },
    findings: [
      {
        id: '10143:0x22b9eb3a62f096515a44a319fc119ea4411c1fb3c2652915497ecd4df57f6d1f:42',
        chainId: 10143,
        transactionHash: '0x22b9eb3a62f096515a44a319fc119ea4411c1fb3c2652915497ecd4df57f6d1f',
        logIndex: 42,
        blockNumber: '73787274',
        classification: 'VERIFIED_DEMO_TRANSFER',
        actualEmitterAddress: DEMO_TOKEN_ADDRESS,
        expectedTokenAddress: DEMO_TOKEN_ADDRESS,
        claimedTransfer: { from: FROM_ADDRESS, to: TO_ADDRESS, amount: AMOUNT },
        checks: [
          { code: 'RECEIPT_SUCCESS', label: 'Receipt status', outcome: 'PASS', detail: 'The transaction receipt reports success.' },
          { code: 'EXPECTED_EMITTER', label: 'Expected emitter', outcome: 'PASS', detail: 'The log emitter matches the configured trusted token.' },
          { code: 'TRANSFER_LOG_DECODED', label: 'Transfer log decoded', outcome: 'PASS', detail: 'Indexed from/to topics and uint256 amount decoded successfully.' },
          { code: 'TOKEN_STATE_SUPPORTS_CLAIM', label: 'Token state evidence', outcome: 'UNKNOWN', detail: 'Balance-delta verification is not implemented in this backend phase.' },
        ],
        explanation: 'The receipt succeeded and the Transfer log was emitted by the configured DemoToken contract.',
        analyzedAt: '2026-10-24T11:38:06.262Z',
      },
    ],
  },
}

export const SCENARIO_B_SPOOFED: DemoScenario = {
  id: 'scenario-b',
  name: 'Scenario B: Event-only Decoy',
  tag: 'Emitter Mismatch',
  description: 'Recorded real event-only transaction emitted by DemoEventOnly on Monad Testnet.',
  transactionHash: '0x321987f432eefd92503aadd386a18d4c7df518653046cdb9e37b54e8cbde07c4',
  response: {
    transaction: {
      chainId: 10143,
      transactionHash: '0x321987f432eefd92503aadd386a18d4c7df518653046cdb9e37b54e8cbde07c4',
      receiptStatus: 'SUCCESS',
      blockNumber: '73787276',
    },
    findings: [
      {
        id: '10143:0x321987f432eefd92503aadd386a18d4c7df518653046cdb9e37b54e8cbde07c4:2',
        chainId: 10143,
        transactionHash: '0x321987f432eefd92503aadd386a18d4c7df518653046cdb9e37b54e8cbde07c4',
        logIndex: 2,
        blockNumber: '73787276',
        classification: 'SUSPICIOUS_EVENT',
        actualEmitterAddress: DECOY_EMITTER_ADDRESS,
        expectedTokenAddress: DEMO_TOKEN_ADDRESS,
        claimedTransfer: { from: FROM_ADDRESS, to: TO_ADDRESS, amount: AMOUNT },
        checks: [
          { code: 'RECEIPT_SUCCESS', label: 'Receipt status', outcome: 'PASS', detail: 'The transaction receipt reports success.' },
          { code: 'EXPECTED_EMITTER', label: 'Expected emitter', outcome: 'FAIL', detail: 'The log emitter does not match the configured trusted token.' },
          { code: 'TRANSFER_LOG_DECODED', label: 'Transfer log decoded', outcome: 'PASS', detail: 'Indexed from/to topics and uint256 amount decoded successfully.' },
          { code: 'TOKEN_STATE_SUPPORTS_CLAIM', label: 'Token state evidence', outcome: 'UNKNOWN', detail: 'Balance-delta verification is not implemented in this backend phase.' },
        ],
        explanation: 'The receipt succeeded, but the Transfer-shaped log was emitted by the configured event-only demo contract rather than DemoToken.',
        analyzedAt: '2026-10-24T11:38:06.437Z',
      },
    ],
  },
}

export const DEMO_PRESETS: Record<string, AnalyzeTransactionResponse> = {
  [SCENARIO_A_LEGITIMATE.transactionHash.toLowerCase()]: SCENARIO_A_LEGITIMATE.response,
  [SCENARIO_B_SPOOFED.transactionHash.toLowerCase()]: SCENARIO_B_SPOOFED.response,
}

export function getDemoPreset(hash: string): AnalyzeTransactionResponse | null {
  return DEMO_PRESETS[hash.trim().toLowerCase()] ?? null
}

export const INITIAL_MONITOR_FINDINGS: SecurityFinding[] = []
