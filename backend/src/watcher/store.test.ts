import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AccountActivity, HexAddress, SecurityFinding, TransactionHash } from '@ghostguard/shared'
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
      const address = `0x${'77'.repeat(20)}` as HexAddress
      firstProcess.saveCheckpoint(10143, 'wallet', 99n)
      firstProcess.saveFinding(createFinding())
      firstProcess.upsertAccountWatch(10143, address, true)
      firstProcess.saveAccountActivity(createActivity({ watchedAddress: address }))
      firstProcess.close()

      const restartedProcess = new SqliteFindingStore(databasePath)
      expect(restartedProcess.getCheckpoint(10143, 'wallet')).toBe(99n)
      expect(restartedProcess.pendingAlerts()).toEqual([createFinding()])
      expect(restartedProcess.listActiveAccountAddresses(10143)).toEqual([address])
      expect(restartedProcess.listAccountActivities(10143, address, 20).items).toHaveLength(1)
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

  it('persists account watches and toggles agent mode without deleting history', () => {
    const store = new SqliteFindingStore(':memory:')
    const address = `0x${'77'.repeat(20)}` as HexAddress

    const enabled = store.upsertAccountWatch(10143, address, true, '2026-10-25T00:00:00.000Z')
    expect(enabled).toEqual({
      chainId: 10143,
      address,
      enabled: true,
      createdAt: '2026-10-25T00:00:00.000Z',
      updatedAt: '2026-10-25T00:00:00.000Z',
    })
    expect(store.listActiveAccountAddresses(10143)).toEqual([address])

    expect(store.saveAccountActivity(createActivity({ watchedAddress: address }))).toBe(true)
    const disabled = store.upsertAccountWatch(10143, address, false, '2026-10-25T00:05:00.000Z')

    expect(disabled.enabled).toBe(false)
    expect(disabled.createdAt).toBe(enabled.createdAt)
    expect(store.listActiveAccountAddresses(10143)).toEqual([])
    expect(store.listAccountActivities(10143, address, 20).items).toHaveLength(1)
    store.close()
  })

  it('deduplicates and paginates durable account activities newest-first', () => {
    const store = new SqliteFindingStore(':memory:')
    const address = `0x${'77'.repeat(20)}` as HexAddress
    const oldest = createActivity({
      id: '10143:activity:1',
      watchedAddress: address,
      observedAt: '2026-10-25T00:00:00.000Z',
    })
    const newest = createActivity({
      id: '10143:activity:2',
      watchedAddress: address,
      transactionHash: `0x${'cd'.repeat(32)}`,
      observedAt: '2026-10-25T00:01:00.000Z',
    })
    store.upsertAccountWatch(10143, address, true)

    expect(store.saveAccountActivity(oldest)).toBe(true)
    expect(store.saveAccountActivity(newest)).toBe(true)
    expect(store.saveAccountActivity(newest)).toBe(false)

    const firstPage = store.listAccountActivities(10143, address, 1)
    expect(firstPage.items).toEqual([newest])
    expect(firstPage.nextCursor).toEqual(expect.any(String))
    expect(store.listAccountActivities(10143, address, 1, firstPage.nextCursor!)).toEqual({
      items: [oldest],
      nextCursor: null,
    })
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

function createActivity(overrides: Partial<AccountActivity> = {}): AccountActivity {
  const watchedAddress = `0x${'77'.repeat(20)}` as HexAddress
  return {
    id: '10143:activity:1',
    chainId: 10143,
    watchedAddress,
    transactionHash: TX_HASH,
    blockNumber: '42',
    direction: 'INCOMING',
    kind: 'TOKEN_TRANSFER',
    verdict: 'CONFIRMED',
    counterpartyAddress: `0x${'88'.repeat(20)}` as HexAddress,
    assetAddress: `0x${'11'.repeat(20)}` as HexAddress,
    amount: '25',
    finding: createFinding({
      claimedTransfer: {
        from: `0x${'88'.repeat(20)}` as HexAddress,
        to: watchedAddress,
        amount: '25',
      },
    }),
    observedAt: '2026-10-25T00:00:00.000Z',
    ...overrides,
  }
}
