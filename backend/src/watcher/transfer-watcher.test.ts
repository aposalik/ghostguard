import { describe, expect, it, vi } from 'vitest'
import type {
  AnalyzeTransactionRequest,
  AnalyzeTransactionResponse,
  HealthResponse,
  HexAddress,
  SecurityFinding,
  TransactionHash,
} from '@ghostguard/shared'
import type { AnalysisService } from '../analyzer/transaction-analyzer.js'
import type { AlertNotifier } from '../notifications/email.js'
import type { RpcFilterLog, RpcLogFilter, RpcReceipt, WatchRpc } from './rpc.js'
import { SqliteFindingStore } from './store.js'
import { TransferWatcher } from './transfer-watcher.js'

const MONITORED = `0x${'44'.repeat(20)}` as HexAddress
const RECIPIENT = `0x${'55'.repeat(20)}` as HexAddress
const TRUSTED = `0x${'11'.repeat(20)}` as HexAddress
const EVENT_ONLY = `0x${'22'.repeat(20)}` as HexAddress

describe('TransferWatcher', () => {
  it('scans hundreds of events, alerts once, and resumes from its checkpoint without duplicates', async () => {
    const logs = Array.from({ length: 101 }, (_, index) => createLog(index, 100n + BigInt(index % 6)))
    const rpc = new FakeWatchRpc(logs, 110n)
    const analyzer = new FakeAnalyzer()
    const store = new SqliteFindingStore(':memory:')
    const notifier: AlertNotifier = { send: vi.fn().mockResolvedValue(undefined) }
    const watcher = new TransferWatcher(rpc, analyzer, store, notifier, {
      monitoredWallets: [MONITORED],
      startBlock: 100n,
      confirmations: 5n,
      blockRange: 2n,
      pollIntervalMs: 1_000,
    })

    await watcher.runOnce()
    await watcher.runOnce()

    expect(analyzer.calls).toBe(101)
    expect(notifier.send).toHaveBeenCalledTimes(1)
    expect(store.pendingAlerts()).toEqual([])
    store.close()
  })

  it('keeps a failed alert pending and retries it on the next cycle', async () => {
    const rpc = new FakeWatchRpc([createLog(100, 100n)], 105n)
    const analyzer = new FakeAnalyzer()
    const store = new SqliteFindingStore(':memory:')
    const send = vi.fn().mockRejectedValueOnce(new Error('provider down')).mockResolvedValueOnce(undefined)
    const watcher = new TransferWatcher(rpc, analyzer, store, { send }, {
      monitoredWallets: [MONITORED],
      startBlock: 100n,
      confirmations: 5n,
      blockRange: 10n,
      pollIntervalMs: 1_000,
    })

    await watcher.runOnce()
    expect(store.pendingAlerts()).toHaveLength(1)
    await watcher.runOnce()
    expect(send).toHaveBeenCalledTimes(2)
    expect(store.pendingAlerts()).toEqual([])
    store.close()
  })
})

class FakeWatchRpc implements WatchRpc {
  private readonly logs: RpcFilterLog[]
  private readonly latestBlock: bigint

  constructor(logs: RpcFilterLog[], latestBlock: bigint) {
    this.logs = logs
    this.latestBlock = latestBlock
  }

  async getChainId(): Promise<number> { return 10143 }
  async getBlockNumber(): Promise<bigint> { return this.latestBlock }
  async getTransactionReceipt(): Promise<RpcReceipt | null> { return null }

  async getLogs(filter: RpcLogFilter): Promise<RpcFilterLog[]> {
    if (filter.topics[1] === null) return []
    return this.logs.filter((log) => {
      const block = BigInt(log.blockNumber)
      return block >= filter.fromBlock && block <= filter.toBlock
    })
  }
}

class FakeAnalyzer implements AnalysisService {
  calls = 0

  async health(): Promise<HealthResponse> {
    return { status: 'ok', chainId: 10143, latestIndexedBlock: null }
  }

  async analyze(request: AnalyzeTransactionRequest): Promise<AnalyzeTransactionResponse> {
    this.calls += 1
    const suspicious = request.transactionHash.endsWith('64')
    const finding = createFinding(request.transactionHash, suspicious)
    return {
      transaction: {
        chainId: 10143,
        transactionHash: request.transactionHash,
        receiptStatus: 'SUCCESS',
        blockNumber: finding.blockNumber,
      },
      findings: [finding],
    }
  }
}

function createLog(index: number, blockNumber: bigint): RpcFilterLog {
  return {
    address: index === 100 ? EVENT_ONLY : TRUSTED,
    transactionHash: `0x${index.toString(16).padStart(64, '0')}`,
    blockNumber: `0x${blockNumber.toString(16)}`,
    logIndex: '0x0',
    topics: [],
    data: '0x',
  }
}

function createFinding(transactionHash: TransactionHash, suspicious: boolean): SecurityFinding {
  return {
    id: `10143:${transactionHash}:0`,
    chainId: 10143,
    transactionHash,
    logIndex: 0,
    blockNumber: '100',
    classification: suspicious ? 'SUSPICIOUS_EVENT' : 'VERIFIED_DEMO_TRANSFER',
    actualEmitterAddress: suspicious ? EVENT_ONLY : TRUSTED,
    expectedTokenAddress: TRUSTED,
    claimedTransfer: { from: MONITORED, to: RECIPIENT, amount: '25' },
    checks: [],
    explanation: suspicious ? 'Controlled event-only emitter.' : 'Trusted token emitter.',
    analyzedAt: '2026-10-24T10:00:00.000Z',
  }
}
