import { describe, expect, it } from 'vitest'
import type { AccountActivity, HexAddress, TransactionHash } from '@ghostguard/shared'
import { buildEvidenceGraph, mergeAccountActivities } from './evidence-graph'

const WATCHED = `0x${'11'.repeat(20)}` as HexAddress
const ALICE = `0x${'22'.repeat(20)}` as HexAddress
const BOB = `0x${'33'.repeat(20)}` as HexAddress

describe('buildEvidenceGraph', () => {
  it('keeps the watched account centered and deduplicates counterparty nodes', () => {
    const graph = buildEvidenceGraph(WATCHED, [
      createActivity({ id: 'incoming-1', counterpartyAddress: ALICE }),
      createActivity({ id: 'incoming-2', counterpartyAddress: ALICE }),
      createActivity({ id: 'outgoing-1', direction: 'OUTGOING', counterpartyAddress: BOB }),
    ])

    expect(graph.nodes.filter((node) => node.isCenter)).toEqual([
      expect.objectContaining({ address: WATCHED, x: 380, y: 235 }),
    ])
    expect(graph.nodes).toHaveLength(3)
    expect(graph.edges).toHaveLength(3)
  })

  it('maps verified directions to green/yellow and lets suspicious evidence override direction', () => {
    const graph = buildEvidenceGraph(WATCHED, [
      createActivity({ id: 'incoming', direction: 'INCOMING', verdict: 'CONFIRMED' }),
      createActivity({ id: 'outgoing', direction: 'OUTGOING', verdict: 'CONFIRMED' }),
      createActivity({ id: 'spoofed', direction: 'INCOMING', verdict: 'SUSPICIOUS' }),
      createActivity({ id: 'unknown', direction: 'OUTGOING', verdict: 'NEEDS_REVIEW' }),
    ])

    expect(graph.edges.map((edge) => [edge.id, edge.tone])).toEqual([
      ['incoming', 'incoming'],
      ['outgoing', 'outgoing'],
      ['spoofed', 'suspicious'],
      ['unknown', 'review'],
    ])
  })

  it('prepends realtime activity without clearing persisted history or duplicating IDs', () => {
    const existing = [
      createActivity({ id: 'older', observedAt: '2026-10-25T00:00:00.000Z' }),
      createActivity({ id: 'same', observedAt: '2026-10-25T00:01:00.000Z' }),
    ]
    const realtime = createActivity({ id: 'same', observedAt: '2026-10-25T00:02:00.000Z' })

    expect(mergeAccountActivities(existing, realtime).map((activity) => activity.id)).toEqual([
      'same',
      'older',
    ])
  })
})

function createActivity(overrides: Partial<AccountActivity> = {}): AccountActivity {
  return {
    id: 'activity',
    chainId: 10143,
    watchedAddress: WATCHED,
    transactionHash: `0x${'aa'.repeat(32)}` as TransactionHash,
    blockNumber: '42',
    direction: 'INCOMING',
    kind: 'TOKEN_TRANSFER',
    verdict: 'CONFIRMED',
    counterpartyAddress: ALICE,
    assetAddress: `0x${'44'.repeat(20)}` as HexAddress,
    amount: '25',
    finding: null,
    observedAt: '2026-10-25T00:00:00.000Z',
    ...overrides,
  }
}
