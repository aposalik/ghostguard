import { describe, expect, it, vi } from 'vitest'
import type { TransactionHash } from '@ghostguard/shared'
import {
  TransactionProducer,
  type TransactionSender,
} from './transaction-producer.js'

const NORMAL_HASH = `0x${'11'.repeat(32)}` as TransactionHash
const SUSPICIOUS_HASH = `0x${'22'.repeat(32)}` as TransactionHash

describe('TransactionProducer', () => {
  it('submits normal transfers and a periodic suspicious event within its budget', async () => {
    const sender = new FakeSender()
    const onSubmitted = vi.fn()
    const producer = new TransactionProducer(sender, {
      ratePerSecond: 2,
      maxTransactions: 3,
      suspiciousEvery: 3,
      onSubmitted,
    })

    await producer.runOnce()
    await producer.runOnce()
    await producer.runOnce()

    expect(sender.kinds).toEqual(['normal', 'normal', 'suspicious'])
    expect(onSubmitted).toHaveBeenCalledTimes(3)
    expect(producer.getStatus()).toMatchObject({
      state: 'budget_exhausted',
      submitted: 3,
      normalSubmitted: 2,
      suspiciousSubmitted: 1,
      failed: 0,
      lastTransactionHash: SUSPICIOUS_HASH,
    })
  })

  it('counts failed attempts against the safety budget without leaking the error', async () => {
    const sender = new FakeSender()
    sender.error = new Error('secret RPC details')
    const onError = vi.fn()
    const producer = new TransactionProducer(sender, {
      ratePerSecond: 1,
      maxTransactions: 1,
      suspiciousEvery: 2,
      onError,
    })

    await producer.runOnce()

    expect(onError).toHaveBeenCalledOnce()
    expect(producer.getStatus()).toMatchObject({
      state: 'budget_exhausted',
      submitted: 0,
      failed: 1,
      lastError: expect.not.stringContaining('secret RPC details'),
    })
  })

  it('rejects unsafe transaction rates', () => {
    expect(() => new TransactionProducer(new FakeSender(), {
      ratePerSecond: 100,
      maxTransactions: 100,
      suspiciousEvery: 10,
    })).toThrow('between 1 and 10')
  })
})

class FakeSender implements TransactionSender {
  readonly kinds: Array<'normal' | 'suspicious'> = []
  error: Error | null = null

  async sendNormal(): Promise<TransactionHash> {
    this.kinds.push('normal')
    if (this.error) throw this.error
    return NORMAL_HASH
  }

  async sendSuspicious(): Promise<TransactionHash> {
    this.kinds.push('suspicious')
    if (this.error) throw this.error
    return SUSPICIOUS_HASH
  }
}
