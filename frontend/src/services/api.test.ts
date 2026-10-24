import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyzeTransaction, isTransactionHash } from './api'

describe('transaction hash validation', () => {
  it('accepts exactly 32 bytes of hex', () => {
    expect(isTransactionHash(`0x${'a1'.repeat(32)}`)).toBe(true)
  })

  it('rejects malformed hashes', () => {
    expect(isTransactionHash('0x1234')).toBe(false)
    expect(isTransactionHash(`0x${'zz'.repeat(32)}`)).toBe(false)
  })
})

describe('analyzeTransaction', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('does not invent a response when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')))

    await expect(analyzeTransaction({ transactionHash: `0x${'a1'.repeat(32)}` })).rejects.toEqual(
      expect.objectContaining({
        code: 'NETWORK_ERROR',
        status: 0,
      }),
    )
  })
})
