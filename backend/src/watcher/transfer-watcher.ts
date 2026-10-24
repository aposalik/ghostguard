import type { AnalysisService } from '../analyzer/transaction-analyzer.js'
import { TRANSFER_TOPIC } from '../analyzer/transaction-analyzer.js'
import type { HexAddress, SecurityFinding, TransactionHash } from '@ghostguard/shared'
import type { AlertNotifier } from '../notifications/email.js'
import type { FindingStore } from './store.js'
import type { RpcFilterLog, WatchRpc } from './rpc.js'

export interface TransferWatcherOptions {
  monitoredWallets: HexAddress[]
  startBlock?: bigint
  confirmations: bigint
  blockRange: bigint
  pollIntervalMs: number
  onError?: (error: unknown) => void
  onFinding?: (finding: SecurityFinding) => void
  onAlert?: (finding: SecurityFinding) => void
}

export class TransferWatcher {
  private readonly rpc: WatchRpc
  private readonly analyzer: AnalysisService
  private readonly store: FindingStore
  private readonly notifier?: AlertNotifier
  private readonly options: TransferWatcherOptions
  private readonly monitored: Set<string>
  private readonly streamKey: string
  private timer?: NodeJS.Timeout
  private activeRun?: Promise<void>
  private stopped = true

  constructor(
    rpc: WatchRpc,
    analyzer: AnalysisService,
    store: FindingStore,
    notifier: AlertNotifier | undefined,
    options: TransferWatcherOptions,
  ) {
    if (options.monitoredWallets.length === 0) throw new Error('At least one monitored wallet is required.')
    if (options.blockRange < 1n) throw new Error('Watcher block range must be positive.')
    this.rpc = rpc
    this.analyzer = analyzer
    this.store = store
    this.notifier = notifier
    this.options = options
    this.monitored = new Set(options.monitoredWallets.map((address) => address.toLowerCase()))
    this.streamKey = `transfer:${[...this.monitored].sort().join(',')}`
  }

  start(): void {
    if (this.timer || this.activeRun) return
    this.stopped = false
    const tick = () => {
      this.activeRun = this.runOnce()
        .catch((error: unknown) => this.options.onError?.(error))
        .finally(() => {
          this.activeRun = undefined
          if (!this.stopped) this.timer = setTimeout(tick, this.options.pollIntervalMs)
        })
    }
    tick()
  }

  async stop(): Promise<void> {
    this.stopped = true
    if (this.timer) clearTimeout(this.timer)
    this.timer = undefined
    await this.activeRun
  }

  async runOnce(): Promise<void> {
    const [chainId, latestBlock] = await Promise.all([this.rpc.getChainId(), this.rpc.getBlockNumber()])
    if (latestBlock < this.options.confirmations) return

    const finalizedBlock = latestBlock - this.options.confirmations
    const checkpoint = this.store.getCheckpoint(chainId, this.streamKey)
    let fromBlock = checkpoint === null ? (this.options.startBlock ?? finalizedBlock) : checkpoint + 1n

    while (fromBlock <= finalizedBlock) {
      const toBlock = min(fromBlock + this.options.blockRange - 1n, finalizedBlock)
      const logs = await this.getWatchedLogs(fromBlock, toBlock)
      await this.analyzeTransactions(logs)
      this.store.saveCheckpoint(chainId, this.streamKey, toBlock)
      fromBlock = toBlock + 1n
    }

    await this.dispatchPendingAlerts()
  }

  private async getWatchedLogs(fromBlock: bigint, toBlock: bigint): Promise<RpcFilterLog[]> {
    const walletTopics = [...this.monitored].map(addressTopic)
    const [sent, received] = await Promise.all([
      this.rpc.getLogs({ fromBlock, toBlock, topics: [TRANSFER_TOPIC, walletTopics] }),
      this.rpc.getLogs({ fromBlock, toBlock, topics: [TRANSFER_TOPIC, null, walletTopics] }),
    ])
    const unique = new Map<string, RpcFilterLog>()
    for (const log of [...sent, ...received]) {
      unique.set(`${log.transactionHash.toLowerCase()}:${BigInt(log.logIndex).toString(10)}`, log)
    }
    return [...unique.values()]
  }

  private async analyzeTransactions(logs: RpcFilterLog[]): Promise<void> {
    const transactionHashes = [...new Set(logs.map((log) => log.transactionHash.toLowerCase()))]
    for (const transactionHash of transactionHashes) {
      const response = await this.analyzer.analyze({ transactionHash: transactionHash as TransactionHash })
      for (const finding of response.findings) {
        if (this.referencesMonitoredWallet(finding) && this.store.saveFinding(finding)) {
          this.options.onFinding?.(finding)
        }
      }
    }
  }

  private referencesMonitoredWallet(finding: SecurityFinding): boolean {
    if (!finding.claimedTransfer) return false
    return this.monitored.has(finding.claimedTransfer.from.toLowerCase())
      || this.monitored.has(finding.claimedTransfer.to.toLowerCase())
  }

  private async dispatchPendingAlerts(): Promise<void> {
    if (!this.notifier) return
    for (const finding of this.store.pendingAlerts()) {
      try {
        await this.notifier.send(finding)
        this.store.markAlerted(finding.id, new Date().toISOString())
        this.options.onAlert?.(finding)
      } catch (error) {
        this.options.onError?.(error)
      }
    }
  }
}

function addressTopic(address: string): string {
  return `0x${address.slice(2).padStart(64, '0')}`
}

function min(first: bigint, second: bigint): bigint {
  return first < second ? first : second
}
