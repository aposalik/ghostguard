import type { AnalyzeTransactionResponse, SecurityFinding } from '@ghostguard/shared'

export interface DemoScenario {
  id: string
  name: string
  tag: string
  description: string
  transactionHash: `0x${string}`
  response: AnalyzeTransactionResponse
}

export const DEMO_TOKEN_ADDRESS = '0x71C8A18E66c6b22bBEaE9D5763529D7dD69c8a14' as const
export const DECOY_EMITTER_ADDRESS = '0xDeC040958189Dbc628f8f08149A7067885b546D5' as const
export const UNKNOWN_CONTRACT_ADDRESS = '0x9999a38f3226a297e594d4838b0f19c36c641b99' as const

export const SCENARIO_A_LEGITIMATE: DemoScenario = {
  id: 'scenario-a',
  name: 'Scenario A: Legitimate Transfer',
  tag: 'Verified',
  description: 'Verified DemoToken transfer on Monad Testnet with matching emitter and valid state.',
  transactionHash: '0x24a1bf7a8b6d8194c730e18103c81e5f8a02a4bf74d4715fbcde3c87a51801f4',
  response: {
    transaction: {
      chainId: 10143,
      transactionHash: '0x24a1bf7a8b6d8194c730e18103c81e5f8a02a4bf74d4715fbcde3c87a51801f4',
      receiptStatus: 'SUCCESS',
      blockNumber: '1849204',
    },
    findings: [
      {
        id: '10143:0x24a1bf7a8b6d8194c730e18103c81e5f8a02a4bf74d4715fbcde3c87a51801f4:0',
        chainId: 10143,
        transactionHash: '0x24a1bf7a8b6d8194c730e18103c81e5f8a02a4bf74d4715fbcde3c87a51801f4',
        logIndex: 0,
        blockNumber: '1849204',
        classification: 'VERIFIED_DEMO_TRANSFER',
        actualEmitterAddress: DEMO_TOKEN_ADDRESS,
        expectedTokenAddress: DEMO_TOKEN_ADDRESS,
        claimedTransfer: {
          from: '0x8b31a89c9d5f0e34587c6e192a0e2d3b4c5e6f7a',
          to: '0x3f5c9e2d1a4b789654123087abcdef0123456789',
          amount: '500000000000000000000', // 500 DEMO
        },
        checks: [
          {
            code: 'RECEIPT_SUCCESS',
            label: 'Transaction receipt',
            outcome: 'PASS',
            detail: 'Monad receipt status is 0x1 (SUCCESS) in block 1849204.',
          },
          {
            code: 'EXPECTED_EMITTER',
            label: 'Log emitter check',
            outcome: 'PASS',
            detail: `Log emitter strictly matches trusted DemoToken contract (${DEMO_TOKEN_ADDRESS}).`,
          },
          {
            code: 'TRANSFER_LOG_DECODED',
            label: 'Transfer event schema',
            outcome: 'PASS',
            detail: 'Standard ERC-20 Transfer(address,address,uint256) signature decoded.',
          },
          {
            code: 'TOKEN_STATE_SUPPORTS_CLAIM',
            label: 'Token balance state',
            outcome: 'PASS',
            detail: 'Contract balance state verifies sender balance decreased and recipient balance increased.',
          },
        ],
        explanation:
          'Verified legitimate token transfer. The event was emitted directly by the official DemoToken contract on Monad Testnet, matching claimed sender, recipient, and balance update.',
        analyzedAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
      },
    ],
  },
}

export const SCENARIO_B_SPOOFED: DemoScenario = {
  id: 'scenario-b',
  name: 'Scenario B: Spoofed Decoy',
  tag: 'Emitter Mismatch',
  description: 'Spoofed Transfer event emitted by DemoEventOnly decoy contract; no token balance moved.',
  transactionHash: '0x5f9c4d28e108bb631a0e1b212f43058a97c6d6706e4a4dc8104e1c7f9bc88a31',
  response: {
    transaction: {
      chainId: 10143,
      transactionHash: '0x5f9c4d28e108bb631a0e1b212f43058a97c6d6706e4a4dc8104e1c7f9bc88a31',
      receiptStatus: 'SUCCESS',
      blockNumber: '1849280',
    },
    findings: [
      {
        id: '10143:0x5f9c4d28e108bb631a0e1b212f43058a97c6d6706e4a4dc8104e1c7f9bc88a31:0',
        chainId: 10143,
        transactionHash: '0x5f9c4d28e108bb631a0e1b212f43058a97c6d6706e4a4dc8104e1c7f9bc88a31',
        logIndex: 0,
        blockNumber: '1849280',
        classification: 'SUSPICIOUS_EVENT',
        actualEmitterAddress: DECOY_EMITTER_ADDRESS,
        expectedTokenAddress: DEMO_TOKEN_ADDRESS,
        claimedTransfer: {
          from: '0x8b31a89c9d5f0e34587c6e192a0e2d3b4c5e6f7a',
          to: '0x3f5c9e2d1a4b789654123087abcdef0123456789',
          amount: '1000000000000000000000', // 1,000 DEMO
        },
        checks: [
          {
            code: 'RECEIPT_SUCCESS',
            label: 'Transaction receipt',
            outcome: 'PASS',
            detail: 'Monad receipt status is 0x1 (SUCCESS). The transaction execution succeeded.',
          },
          {
            code: 'EXPECTED_EMITTER',
            label: 'Log emitter check',
            outcome: 'FAIL',
            detail: `EMITTER MISMATCH: Log was emitted by contract ${DECOY_EMITTER_ADDRESS}, NOT the trusted DemoToken contract ${DEMO_TOKEN_ADDRESS}.`,
          },
          {
            code: 'TRANSFER_LOG_DECODED',
            label: 'Transfer event schema',
            outcome: 'PASS',
            detail: 'Event successfully masquerades with standard Transfer(address,address,uint256) signature.',
          },
          {
            code: 'TOKEN_STATE_SUPPORTS_CLAIM',
            label: 'Token balance state',
            outcome: 'FAIL',
            detail: 'No actual token balance changed on DemoToken. The event is a fabricated decoy log.',
          },
        ],
        explanation: `Log was emitted by contract ${DECOY_EMITTER_ADDRESS}, NOT the trusted DemoToken contract ${DEMO_TOKEN_ADDRESS}. No actual token balance changed.`,
        analyzedAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
      },
    ],
  },
}

export const SCENARIO_C_REVIEW: DemoScenario = {
  id: 'scenario-c',
  name: 'Scenario C: Unrecognized Emitter',
  tag: 'Needs Review',
  description: 'Unrecognized third-party contract emitted a transfer event; outside allowlist.',
  transactionHash: '0x7a8c3d19e048bb621a0e1b212f43058a97c6d6706e4a4dc8104e1c7f9bc88a99',
  response: {
    transaction: {
      chainId: 10143,
      transactionHash: '0x7a8c3d19e048bb621a0e1b212f43058a97c6d6706e4a4dc8104e1c7f9bc88a99',
      receiptStatus: 'SUCCESS',
      blockNumber: '1849150',
    },
    findings: [
      {
        id: '10143:0x7a8c3d19e048bb621a0e1b212f43058a97c6d6706e4a4dc8104e1c7f9bc88a99:1',
        chainId: 10143,
        transactionHash: '0x7a8c3d19e048bb621a0e1b212f43058a97c6d6706e4a4dc8104e1c7f9bc88a99',
        logIndex: 1,
        blockNumber: '1849150',
        classification: 'NEEDS_REVIEW',
        actualEmitterAddress: UNKNOWN_CONTRACT_ADDRESS,
        expectedTokenAddress: null,
        claimedTransfer: {
          from: '0x1111222233334444555566667777888899990000',
          to: '0xaaaaabbbbbcccccdddddeeeeefffff0000011111',
          amount: '25000000000000000000', // 25 tokens
        },
        checks: [
          {
            code: 'RECEIPT_SUCCESS',
            label: 'Transaction receipt',
            outcome: 'PASS',
            detail: 'Receipt status 0x1 (SUCCESS) on Monad Testnet.',
          },
          {
            code: 'EXPECTED_EMITTER',
            label: 'Log emitter check',
            outcome: 'UNKNOWN',
            detail: `Emitter ${UNKNOWN_CONTRACT_ADDRESS} is not in GhostGuard trusted demo registry.`,
          },
          {
            code: 'TRANSFER_LOG_DECODED',
            label: 'Transfer event schema',
            outcome: 'PASS',
            detail: 'Valid Transfer topic format found.',
          },
          {
            code: 'TOKEN_STATE_SUPPORTS_CLAIM',
            label: 'Token balance state',
            outcome: 'UNKNOWN',
            detail: 'State proofs unavailable for unrecognized contract.',
          },
        ],
        explanation: 'Evidence is incomplete; review the emitting contract on Monad Explorer before trusting this event.',
        analyzedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      },
    ],
  },
}

export const DEMO_PRESETS: Record<string, AnalyzeTransactionResponse> = {
  [SCENARIO_A_LEGITIMATE.transactionHash.toLowerCase()]: SCENARIO_A_LEGITIMATE.response,
  [SCENARIO_B_SPOOFED.transactionHash.toLowerCase()]: SCENARIO_B_SPOOFED.response,
  [SCENARIO_C_REVIEW.transactionHash.toLowerCase()]: SCENARIO_C_REVIEW.response,
}

export function getDemoPreset(hash: string): AnalyzeTransactionResponse | null {
  return DEMO_PRESETS[hash.trim().toLowerCase()] ?? null
}

export const INITIAL_MONITOR_FINDINGS: SecurityFinding[] = [
  SCENARIO_B_SPOOFED.response.findings[0]!,
  SCENARIO_A_LEGITIMATE.response.findings[0]!,
  SCENARIO_C_REVIEW.response.findings[0]!,
]
