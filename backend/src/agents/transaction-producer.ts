import type {
  HexAddress,
  ProducerAgentStatus,
  TransactionHash,
} from '@ghostguard/shared'
import {
  createWalletClient,
  defineChain,
  http,
  parseAbi,
  type Account,
  type Chain,
  type WalletClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const demoTokenAbi = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
])
const demoEventOnlyAbi = parseAbi([
  'function emitTransfer(address from, address to, uint256 amount)',
])

export interface TransactionSender {
  sendNormal(): Promise<TransactionHash>
  sendSuspicious(): Promise<TransactionHash>
}

export interface TransactionProducerOptions {
  ratePerSecond: number
  maxTransactions: number
  suspiciousEvery: number
  onSubmitted?: (kind: 'normal' | 'suspicious', transactionHash: TransactionHash) => void
  onError?: (error: unknown) => void
}

export class TransactionProducer {
  private readonly sender: TransactionSender
  private readonly options: TransactionProducerOptions
  private timer?: NodeJS.Timeout
  private activeRun?: Promise<void>
  private stopped = true
  private status: ProducerAgentStatus

  constructor(sender: TransactionSender, options: TransactionProducerOptions) {
    if (options.ratePerSecond < 1 || options.ratePerSecond > 10) {
      throw new Error('Producer rate must be between 1 and 10 transactions per second.')
    }
    if (options.maxTransactions < 1) throw new Error('Producer transaction budget must be positive.')
    if (options.suspiciousEvery < 2) throw new Error('Producer suspicious interval must be at least two.')

    this.sender = sender
    this.options = options
    this.status = {
      enabled: true,
      state: 'stopped',
      ratePerSecond: options.ratePerSecond,
      maxTransactions: options.maxTransactions,
      suspiciousEvery: options.suspiciousEvery,
      submitted: 0,
      normalSubmitted: 0,
      suspiciousSubmitted: 0,
      failed: 0,
      lastTransactionHash: null,
      lastActivityAt: null,
      lastError: null,
    }
  }

  start(): void {
    if (!this.stopped || this.timer || this.activeRun) return
    if (this.atBudget()) {
      this.status.state = 'budget_exhausted'
      return
    }

    this.stopped = false
    this.status.state = 'running'
    this.schedule(0)
  }

  async stop(): Promise<void> {
    this.stopped = true
    if (this.timer) clearTimeout(this.timer)
    this.timer = undefined
    await this.activeRun
    if (this.status.state !== 'budget_exhausted') this.status.state = 'stopped'
  }

  getStatus(): ProducerAgentStatus {
    return { ...this.status }
  }

  async runOnce(): Promise<void> {
    if (this.atBudget()) {
      this.status.state = 'budget_exhausted'
      this.stopped = true
      return
    }

    const sequence = this.status.submitted + this.status.failed + 1
    const kind = sequence % this.options.suspiciousEvery === 0 ? 'suspicious' : 'normal'

    try {
      const transactionHash = kind === 'suspicious'
        ? await this.sender.sendSuspicious()
        : await this.sender.sendNormal()
      this.status.submitted += 1
      if (kind === 'suspicious') this.status.suspiciousSubmitted += 1
      else this.status.normalSubmitted += 1
      this.status.lastTransactionHash = transactionHash
      this.status.lastActivityAt = new Date().toISOString()
      this.status.lastError = null
      this.status.state = 'running'
      this.options.onSubmitted?.(kind, transactionHash)
    } catch (error) {
      this.status.failed += 1
      this.status.lastActivityAt = new Date().toISOString()
      this.status.lastError = 'Transaction submission failed; the producer will retry within its configured budget.'
      this.status.state = 'error'
      this.options.onError?.(error)
    }

    if (this.atBudget()) {
      this.status.state = 'budget_exhausted'
      this.stopped = true
    }
  }

  private schedule(delayMs: number): void {
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.activeRun = this.runOnce().finally(() => {
        this.activeRun = undefined
        if (!this.stopped) this.schedule(Math.ceil(1_000 / this.options.ratePerSecond))
      })
    }, delayMs)
  }

  private atBudget(): boolean {
    return this.status.submitted + this.status.failed >= this.options.maxTransactions
  }
}

export interface ViemTransactionSenderOptions {
  rpcUrl: string
  privateKey: `0x${string}`
  recipientAddress: HexAddress
  demoTokenAddress: HexAddress
  demoEventOnlyAddress: HexAddress
  amount: bigint
  chainId?: number
}

export function createViemTransactionSender(options: ViemTransactionSenderOptions): TransactionSender {
  const account = privateKeyToAccount(options.privateKey)
  const chain = defineChain({
    id: options.chainId ?? 10_143,
    name: 'Monad Testnet',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: { default: { http: [options.rpcUrl] } },
  })
  const client = createWalletClient({ account, chain, transport: http(options.rpcUrl) })

  return new ViemTransactionSender(client, account, chain, options)
}

class ViemTransactionSender implements TransactionSender {
  private readonly client: WalletClient
  private readonly account: Account
  private readonly chain: Chain
  private readonly options: ViemTransactionSenderOptions

  constructor(
    client: WalletClient,
    account: Account,
    chain: Chain,
    options: ViemTransactionSenderOptions,
  ) {
    this.client = client
    this.account = account
    this.chain = chain
    this.options = options
  }

  async sendNormal(): Promise<TransactionHash> {
    return await this.client.writeContract({
      account: this.account,
      chain: this.chain,
      address: this.options.demoTokenAddress,
      abi: demoTokenAbi,
      functionName: 'transfer',
      args: [this.options.recipientAddress, this.options.amount],
    }) as TransactionHash
  }

  async sendSuspicious(): Promise<TransactionHash> {
    return await this.client.writeContract({
      account: this.account,
      chain: this.chain,
      address: this.options.demoEventOnlyAddress,
      abi: demoEventOnlyAbi,
      functionName: 'emitTransfer',
      args: [this.account.address, this.options.recipientAddress, this.options.amount],
    }) as TransactionHash
  }
}

export function disabledProducerStatus(): ProducerAgentStatus {
  return {
    enabled: false,
    state: 'disabled',
    ratePerSecond: 0,
    maxTransactions: 0,
    suspiciousEvery: 0,
    submitted: 0,
    normalSubmitted: 0,
    suspiciousSubmitted: 0,
    failed: 0,
    lastTransactionHash: null,
    lastActivityAt: null,
    lastError: null,
  }
}
