import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { HexAddress, SecurityFinding, TransactionHash } from '@ghostguard/shared'
import { InvalidFindingsCursorError, SqliteFindingStore } from './store.js'

const TX_HASH = `0x${'ab'.repeat(32)}` as TransactionHash

describe('SqliteFindingStore', () => {
  it('persists checkpoints and deduplicates canonical event identities', () => {
    const store = new SqliteFindingStore(':memory:')
    const finding = createFinding()

    expect(store.getCheckpoint(10143, 'wallet')).toBeNull()
    store.saveCheckpoint(10143, 'wallet', 42n)
    expect(store.getCheckpoint(10143, 'wallet')).toBe(42n)
    expect(store.saveFinding(finding)).toBe(true)
    expect(store.saveFinding(finding)).toBe(false)
    expect(store.pendingAlerts()).toEqual([finding])

    store.markAlerted(finding.id, '2026-10-24T10:00:01.000Z')
    expect(store.pendingAlerts()).toEqual([])
    store.close()
  })

  it('recovers checkpoints and unsent alerts after a process restart', () => {
    const directory = mkdtempSync(join(tmpdir(), 'ghostguard-store-'))
    const databasePath = join(directory, 'findings.db')

    try {
      const firstProcess = new SqliteFindingStore(databasePath)
      firstProcess.saveCheckpoint(10143, 'wallet', 99n)
      firstProcess.saveFinding(createFinding())
      firstProcess.close()

      const restartedProcess = new SqliteFindingStore(databasePath)
      expect(restartedProcess.getCheckpoint(10143, 'wallet')).toBe(99n)
      expect(restartedProcess.pendingAlerts()).toEqual([createFinding()])
      restartedProcess.close()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('lists findings newest-first with opaque cursor pagination', () => {
    const store = new SqliteFindingStore(':memory:')
    const oldest = createFinding({
      id: `10143:${`0x${'01'.repeat(32)}`}:0`,
      transactionHash: `0x${'01'.repeat(32)}`,
      analyzedAt: '2026-10-24T10:00:00.000Z',
    })
    const middle = createFinding({
      id: `10143:${`0x${'02'.repeat(32)}`}:0`,
      transactionHash: `0x${'02'.repeat(32)}`,
      analyzedAt: '2026-10-24T10:01:00.000Z',
    })
    const newest = createFinding({
      id: `10143:${`0x${'03'.repeat(32)}`}:0`,
      transactionHash: `0x${'03'.repeat(32)}`,
      analyzedAt: '2026-10-24T10:02:00.000Z',
    })
    for (const finding of [middle, oldest, newest]) store.saveFinding(finding)

    const firstPage = store.listFindings(2)
    expect(firstPage.items).toEqual([newest, middle])
    expect(firstPage.nextCursor).toEqual(expect.any(String))

    const secondPage = store.listFindings(2, firstPage.nextCursor!)
    expect(secondPage).toEqual({ items: [oldest], nextCursor: null })
    store.close()
  })

  it('rejects malformed findings cursors', () => {
    const store = new SqliteFindingStore(':memory:')
    expect(() => store.listFindings(20, 'not-a-cursor')).toThrow(InvalidFindingsCursorError)
    store.close()
  })
})

function createFinding(overrides: Partial<SecurityFinding> = {}): SecurityFinding {
  return {
    id: `10143:${TX_HASH}:2`,
    chainId: 10143,
    transactionHash: TX_HASH,
    logIndex: 2,
    blockNumber: '42',
    classification: 'SUSPICIOUS_EVENT',
    actualEmitterAddress: `0x${'22'.repeat(20)}` as HexAddress,
    expectedTokenAddress: `0x${'11'.repeat(20)}` as HexAddress,
    claimedTransfer: {
      from: `0x${'33'.repeat(20)}` as HexAddress,
      to: `0x${'44'.repeat(20)}` as HexAddress,
      amount: '25',
    },
    checks: [],
    explanation: 'Controlled suspicious event.',
    analyzedAt: '2026-10-24T10:00:00.000Z',
    ...overrides,
  }
}
