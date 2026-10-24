import { describe, expect, it } from 'vitest'
import type { HexAddress, TransactionHash } from '@ghostguard/shared'
import { TransactionNotFoundError } from './errors.js'
import { TransactionAnalyzer, TRANSFER_TOPIC } from './transaction-analyzer.js'
import type { EthereumRpc, RpcReceipt } from '../watcher/rpc.js'

const TX_HASH = `0x${'ab'.repeat(32)}` as TransactionHash
const TRUSTED_TOKEN = `0x${'11'.repeat(20)}` as HexAddress
const EVENT_ONLY = `0x${'22'.repeat(20)}` as HexAddress
const UNKNOWN = `0x${'33'.repeat(20)}` as HexAddress
const FROM = `0x${'44'.repeat(20)}` as HexAddress
const TO = `0x${'55'.repeat(20)}` as HexAddress
const FIXED_TIME = new Date('2026-10-24T09:30:00.000Z')

class FakeRpc implements EthereumRpc {
  private readonly receipt: RpcReceipt | null
  private readonly chainId: number

  constructor(receipt: RpcReceipt | null, chainId = 1) {
    this.receipt = receipt
    this.chainId = chainId
  }

  async getChainId(): Promise<number> {
    return this.chainId
  }

  async getTransactionReceipt(): Promise<RpcReceipt | null> {
    return this.receipt
  }
}

describe('TransactionAnalyzer', () => {
  it('classifies a decoded log from the configured DemoToken as verified', async () => {
    const analyzer = createAnalyzer(transferReceipt(TRUSTED_TOKEN, 25n))
    const response = await analyzer.analyze({ transactionHash: TX_HASH })

    expect(response.transaction).toEqual({
      chainId: 1,
      transactionHash: TX_HASH,
      receiptStatus: 'SUCCESS',
      blockNumber: '42',
    })
    expect(response.findings).toHaveLength(1)
    expect(response.findings[0]).toMatchObject({
      id: `1:${TX_HASH}:2`,
      classification: 'VERIFIED_DEMO_TRANSFER',
      actualEmitterAddress: TRUSTED_TOKEN,
      expectedTokenAddress: TRUSTED_TOKEN,
      claimedTransfer: { from: FROM, to: TO, amount: '25' },
      analyzedAt: FIXED_TIME.toISOString(),
    })
    expect(response.findings[0]?.checks.map((check) => check.outcome)).toEqual([
      'PASS',
      'PASS',
      'PASS',
      'UNKNOWN',
    ])
  })

  it('classifies a decoded log from the configured event-only contract as suspicious', async () => {
    const analyzer = createAnalyzer(transferReceipt(EVENT_ONLY, 99n))
    const response = await analyzer.analyze({ transactionHash: TX_HASH })

    expect(response.findings[0]).toMatchObject({
      classification: 'SUSPICIOUS_EVENT',
      actualEmitterAddress: EVENT_ONLY,
      expectedTokenAddress: TRUSTED_TOKEN,
    })
    expect(response.findings[0]?.checks[1]?.outcome).toBe('FAIL')
  })

  it('keeps an unknown emitter in needs-review rather than calling it fraud', async () => {
    const analyzer = createAnalyzer(transferReceipt(UNKNOWN, 5n))
    const response = await analyzer.analyze({ transactionHash: TX_HASH })

    expect(response.findings[0]?.classification).toBe('NEEDS_REVIEW')
  })

  it('does not verify a malformed transfer-shaped log', async () => {
    const receipt = transferReceipt(TRUSTED_TOKEN, 5n)
    receipt.logs[0]!.data = '0x01'
    const analyzer = createAnalyzer(receipt)
    const response = await analyzer.analyze({ transactionHash: TX_HASH })

    expect(response.findings[0]).toMatchObject({
      classification: 'NEEDS_REVIEW',
      claimedTransfer: null,
    })
    expect(response.findings[0]?.checks[2]?.outcome).toBe('FAIL')
  })

  it('returns a reverted transaction without inventing a transfer finding', async () => {
    const receipt = transferReceipt(TRUSTED_TOKEN, 5n)
    receipt.status = '0x0'
    const analyzer = createAnalyzer(receipt)
    const response = await analyzer.analyze({ transactionHash: TX_HASH })

    expect(response.transaction.receiptStatus).toBe('REVERTED')
    expect(response.findings).toEqual([])
  })

  it('throws a domain error when no receipt is available', async () => {
    const analyzer = createAnalyzer(null)

    await expect(analyzer.analyze({ transactionHash: TX_HASH })).rejects.toBeInstanceOf(TransactionNotFoundError)
  })
})

function createAnalyzer(receipt: RpcReceipt | null): TransactionAnalyzer {
  return new TransactionAnalyzer(new FakeRpc(receipt), {
    trustedDemoTokenAddress: TRUSTED_TOKEN,
    demoEventOnlyAddress: EVENT_ONLY,
    now: () => FIXED_TIME,
  })
}

function transferReceipt(emitter: HexAddress, amount: bigint): RpcReceipt {
  return {
    transactionHash: TX_HASH,
    blockNumber: '0x2a',
    status: '0x1',
    logs: [
      {
        address: emitter.toUpperCase().replace('0X', '0x'),
        topics: [
          TRANSFER_TOPIC,
          addressTopic(FROM),
          addressTopic(TO),
        ],
        data: `0x${amount.toString(16).padStart(64, '0')}`,
        logIndex: '0x2',
      },
    ],
  }
}

function addressTopic(address: HexAddress): string {
  return `0x${address.slice(2).padStart(64, '0')}`
}
