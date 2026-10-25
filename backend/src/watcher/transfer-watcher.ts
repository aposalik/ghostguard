import type { AnalysisService } from '../analyzer/transaction-analyzer.js'
import { TRANSFER_TOPIC } from '../analyzer/transaction-analyzer.js'
import type {
  AccountActivity,
  AccountActivityDirection,
  AccountActivityVerdict,
  DetectorAgentStatus,
  HexAddress,
  SecurityFinding,
  TransactionHash,
} from '@ghostguard/shared'
import type { AlertNotifier } from '../notifications/email.js'
import type { FindingStore } from './store.js'
import type { RpcBlockTransaction, RpcFilterLog, WatchRpc } from './rpc.js'

export interface TransferWatcherOptions {
  monitoredWallets: HexAddress[]
  startBlock?: bigint
  /** Optional explicit replay point for top-level transactions; defaults to listen-from-now. */
  transactionStartBlock?: bigint
  confirmations: bigint
  blockRange: bigint
  pollIntervalMs: number
  onError?: (error: unknown) => void
  onFinding?: (finding: SecurityFinding) => void
  onActivity?: (activity: AccountActivity) => void
  onAlert?: (finding: SecurityFinding) => void
}

export class TransferWatcher {
  private readonly rpc: WatchRpc
  private readonly analyzer: AnalysisService
  private readonly store: FindingStore
  private readonly notifier?: AlertNotifier
  private readonly options: TransferWatcherOptions
  private readonly configuredWallets: HexAddress[]
  private readonly findingsStreamKey = 'transfer-findings:v2'
  private readonly transactionsStreamKey = 'account-transactions:v1'
  private timer?: NodeJS.Timeout
  private activeRun?: Promise<void>
  private stopped = true
  private configuredWatchesSeeded = false
  private status: DetectorAgentStatus

  constructor(
    rpc: WatchRpc,
    analyzer: AnalysisService,
    store: FindingStore,
    notifier: AlertNotifier | undefined,
    options: TransferWatcherOptions,
  ) {
    if (options.blockRange < 1n) throw new Error('Watcher block range must be positive.')
    this.rpc = rpc
    this.analyzer = analyzer
    this.store = store
    this.notifier = notifier
    this.options = options
    this.configuredWallets = [
      ...new Set(options.monitoredWallets.map((address) => normalizeAddress(address) as HexAddress)),
    ]
    this.status = {
      enabled: true,
      state: 'stopped',
      emailNotificationsEnabled: Boolean(notifier),
      monitoredWalletCount: this.configuredWallets.length,
      pollIntervalMs: options.pollIntervalMs,
      cyclesCompleted: 0,
      logsObserved: 0,
      findingsStored: 0,
      alertsDelivered: 0,
      lastActivityAt: null,
      lastError: null,
    }
  }

  start(): void {
    if (this.timer || this.activeRun) return
    this.stopped = false
    this.status.state = 'running'
    const tick = () => {
      this.activeRun = this.runOnce()
        .catch((error: unknown) => {
          this.status.state = 'error'
          this.status.lastError = 'Detector cycle failed; it will retry automatically.'
          this.status.lastActivityAt = new Date().toISOString()
          this.options.onError?.(error)
        })
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
    this.status.state = 'stopped'
  }

  getStatus(): DetectorAgentStatus {
    return { ...this.status }
  }

  async runOnce(): Promise<void> {
    const [chainId, latestBlock] = await Promise.all([this.rpc.getChainId(), this.rpc.getBlockNumber()])
    if (latestBlock < this.options.confirmations) return

    const finalizedBlock = latestBlock - this.options.confirmations
    const monitored = this.loadMonitoredAccounts(chainId)
    this.status.monitoredWalletCount = monitored.size

    if (monitored.size === 0) {
      this.store.saveCheckpoint(chainId, this.findingsStreamKey, finalizedBlock)
      this.store.saveCheckpoint(chainId, this.transactionsStreamKey, finalizedBlock)
      this.finishCycle()
      return
    }

    await this.scanTransferFindings(chainId, finalizedBlock, monitored)
    await this.scanTopLevelTransactions(chainId, finalizedBlock, monitored)
    await this.dispatchPendingAlerts()
    this.finishCycle()
  }

  private async scanTransferFindings(
    chainId: number,
    finalizedBlock: bigint,
    monitored: Set<string>,
  ): Promise<void> {
    const checkpoint = this.store.getCheckpoint(chainId, this.findingsStreamKey)
    let fromBlock = checkpoint === null ? (this.options.startBlock ?? finalizedBlock) : checkpoint + 1n
    while (fromBlock <= finalizedBlock) {
      const toBlock = min(fromBlock + this.options.blockRange - 1n, finalizedBlock)
      const logs = await this.getWatchedLogs(fromBlock, toBlock, monitored)
      await this.analyzeTransactions(logs, monitored)
      this.store.saveCheckpoint(chainId, this.findingsStreamKey, toBlock)
      fromBlock = toBlock + 1n
    }
  }

  private async scanTopLevelTransactions(
    chainId: number,
    finalizedBlock: bigint,
    monitored: Set<string>,
  ): Promise<void> {
    const checkpoint = this.store.getCheckpoint(chainId, this.transactionsStreamKey)
    if (checkpoint === null && this.options.transactionStartBlock === undefined) {
      this.store.saveCheckpoint(chainId, this.transactionsStreamKey, finalizedBlock)
      return
    }

    let fromBlock = checkpoint === null ? this.options.transactionStartBlock! : checkpoint + 1n
    while (fromBlock <= finalizedBlock) {
      const toBlock = min(fromBlock + this.options.blockRange - 1n, finalizedBlock)
      const transactions = await this.getWatchedTransactions(fromBlock, toBlock, monitored)
      await this.storeTopLevelActivities(chainId, transactions, monitored)
      this.store.saveCheckpoint(chainId, this.transactionsStreamKey, toBlock)
      fromBlock = toBlock + 1n
    }
  }

  private loadMonitoredAccounts(chainId: number): Set<string> {
    if (!this.configuredWatchesSeeded) {
      for (const address of this.configuredWallets) {
        this.store.upsertAccountWatch(chainId, address, true)
      }
      this.configuredWatchesSeeded = true
    }
    return new Set(this.store.listActiveAccountAddresses(chainId).map(normalizeAddress))
  }

  private async getWatchedLogs(
    fromBlock: bigint,
    toBlock: bigint,
    monitored: Set<string>,
  ): Promise<RpcFilterLog[]> {
    const walletTopics = [...monitored].map(addressTopic)
    const [sent, received] = await Promise.all([
      this.rpc.getLogs({ fromBlock, toBlock, topics: [TRANSFER_TOPIC, walletTopics] }),
      this.rpc.getLogs({ fromBlock, toBlock, topics: [TRANSFER_TOPIC, null, walletTopics] }),
    ])
    const unique = new Map<string, RpcFilterLog>()
    for (const log of [...sent, ...received]) {
      unique.set(`${log.transactionHash.toLowerCase()}:${BigInt(log.logIndex).toString(10)}`, log)
    }
    this.status.logsObserved += unique.size
    return [...unique.values()]
  }

  private async getWatchedTransactions(
    fromBlock: bigint,
    toBlock: bigint,
    monitored: Set<string>,
  ): Promise<RpcBlockTransaction[]> {
    const transactions: RpcBlockTransaction[] = []
    for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber += 1n) {
      const blockTransactions = await this.rpc.getBlockTransactions(blockNumber)
      transactions.push(...blockTransactions.filter((transaction) => (
        monitored.has(transaction.from.toLowerCase())
        || (transaction.to !== null && monitored.has(transaction.to.toLowerCase()))
      )))
    }
    return transactions
  }

  private async analyzeTransactions(logs: RpcFilterLog[], monitored: Set<string>): Promise<void> {
    const transactionHashes = [...new Set(logs.map((log) => log.transactionHash.toLowerCase()))]
    for (const transactionHash of transactionHashes) {
      const response = await this.analyzer.analyze({ transactionHash: transactionHash as TransactionHash })
      for (const finding of response.findings) {
        const referencedAccounts = this.referencedAccounts(finding, monitored)
        if (referencedAccounts.length === 0) continue

        if (this.store.saveFinding(finding)) {
          this.status.findingsStored += 1
          this.options.onFinding?.(finding)
        }
        for (const account of referencedAccounts) {
          this.storeActivity(activityFromFinding(finding, account))
        }
      }
    }
  }

  private referencedAccounts(finding: SecurityFinding, monitored: Set<string>): HexAddress[] {
    if (!finding.claimedTransfer) return []
    const addresses = [finding.claimedTransfer.from, finding.claimedTransfer.to]
      .map(normalizeAddress)
      .filter((address, index, all) => monitored.has(address) && all.indexOf(address) === index)
    return addresses as HexAddress[]
  }

  private async storeTopLevelActivities(
    chainId: number,
    transactions: RpcBlockTransaction[],
    monitored: Set<string>,
  ): Promise<void> {
    for (const transaction of transactions) {
      const receipt = await this.rpc.getTransactionReceipt(transaction.hash)
      const verdict: AccountActivityVerdict = receipt?.status === '0x0'
        ? 'REVERTED'
        : receipt?.status === '0x1'
          ? 'CONFIRMED'
          : 'NEEDS_REVIEW'
      const from = normalizeAddress(transaction.from)
      const to = transaction.to ? normalizeAddress(transaction.to) : null
      const referenced = [...new Set([from, to].filter((address): address is string => (
        address !== null && monitored.has(address)
      )))]

      for (const account of referenced) {
        const direction: AccountActivityDirection = from === account && to === account
          ? 'SELF'
          : from === account
            ? 'OUTGOING'
            : 'INCOMING'
        const counterparty = direction === 'INCOMING' ? from : to
        const activity: AccountActivity = {
          id: `${chainId}:${transaction.hash}:transaction:${account}`,
          chainId,
          watchedAddress: account as HexAddress,
          transactionHash: transaction.hash,
          blockNumber: BigInt(transaction.blockNumber).toString(10),
          direction,
          kind: transaction.input === '0x' ? 'NATIVE_TRANSFER' : 'CONTRACT_CALL',
          verdict,
          counterpartyAddress: counterparty as HexAddress | null,
          assetAddress: null,
          amount: BigInt(transaction.value).toString(10),
          finding: null,
          observedAt: new Date().toISOString(),
        }
        this.storeActivity(activity)
      }
    }
  }

  private storeActivity(activity: AccountActivity): void {
    if (this.store.saveAccountActivity(activity)) {
      this.options.onActivity?.(activity)
    }
  }

  private async dispatchPendingAlerts(): Promise<void> {
    if (!this.notifier) return
    for (const finding of this.store.pendingAlerts()) {
      try {
        await this.notifier.send(finding)
        this.store.markAlerted(finding.id, new Date().toISOString())
        this.status.alertsDelivered += 1
        this.options.onAlert?.(finding)
      } catch (error) {
        this.options.onError?.(error)
      }
    }
  }

  private finishCycle(): void {
    this.status.cyclesCompleted += 1
    this.status.lastActivityAt = new Date().toISOString()
    this.status.lastError = null
    this.status.state = 'running'
  }
}

export function disabledDetectorStatus(): DetectorAgentStatus {
  return {
    enabled: false,
    state: 'disabled',
    emailNotificationsEnabled: false,
    monitoredWalletCount: 0,
    pollIntervalMs: 0,
    cyclesCompleted: 0,
    logsObserved: 0,
    findingsStored: 0,
    alertsDelivered: 0,
    lastActivityAt: null,
    lastError: null,
  }
}

function activityFromFinding(finding: SecurityFinding, account: HexAddress): AccountActivity {
  const transfer = finding.claimedTransfer
  if (!transfer) throw new Error('A token activity requires a decoded transfer claim.')
  const from = normalizeAddress(transfer.from)
  const to = normalizeAddress(transfer.to)
  const normalizedAccount = normalizeAddress(account)
  const direction: AccountActivityDirection = from === normalizedAccount && to === normalizedAccount
    ? 'SELF'
    : from === normalizedAccount
      ? 'OUTGOING'
      : 'INCOMING'
  const verdict: AccountActivityVerdict = finding.classification === 'SUSPICIOUS_EVENT'
    ? 'SUSPICIOUS'
    : finding.classification === 'VERIFIED_DEMO_TRANSFER'
      ? 'CONFIRMED'
      : 'NEEDS_REVIEW'

  return {
    id: `${finding.id}:watch:${normalizedAccount}`,
    chainId: finding.chainId,
    watchedAddress: normalizedAccount as HexAddress,
    transactionHash: finding.transactionHash,
    blockNumber: finding.blockNumber,
    direction,
    kind: 'TOKEN_TRANSFER',
    verdict,
    counterpartyAddress: (direction === 'INCOMING' ? from : to) as HexAddress,
    assetAddress: finding.actualEmitterAddress,
    amount: transfer.amount,
    finding,
    observedAt: finding.analyzedAt,
  }
}

function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

function addressTopic(address: string): string {
  return `0x${address.slice(2).padStart(64, '0')}`
}

function min(first: bigint, second: bigint): bigint {
  return first < second ? first : second
}
