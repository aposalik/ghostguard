import { describe, expect, it, vi } from 'vitest'
import type { HexAddress, SecurityFinding, TransactionHash } from '@ghostguard/shared'
import { EmailDeliveryError, ResendEmailNotifier } from './email.js'

describe('ResendEmailNotifier', () => {
  it('sends an escaped evidence-based alert', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 200 }))
    const notifier = new ResendEmailNotifier({
      apiUrl: 'https://email.example.test/messages',
      apiKey: 'test-key',
      from: 'alerts@example.test',
      to: 'owner@example.test',
      explorerUrl: 'https://explorer.example.test',
      fetcher,
    })

    await notifier.send(createFinding('<script>alert(1)</script>'))

    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as { html: string; text: string }
    expect(body.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(body.html).not.toContain('<script>')
    expect(body.text).toContain('SUSPICIOUS_EVENT')
    expect(fetcher).toHaveBeenCalledWith(
      'https://email.example.test/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Idempotency-Key': expect.stringContaining('ghostguard/10143:'),
        }),
      }),
    )
  })

  it('surfaces provider failures without marking an alert delivered', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 503 }))
    const notifier = new ResendEmailNotifier({
      apiUrl: 'https://email.example.test/messages',
      apiKey: 'test-key',
      from: 'alerts@example.test',
      to: 'owner@example.test',
      explorerUrl: 'https://explorer.example.test',
      fetcher,
    })

    await expect(notifier.send(createFinding('evidence'))).rejects.toBeInstanceOf(EmailDeliveryError)
  })
})

function createFinding(explanation: string): SecurityFinding {
  const transactionHash = `0x${'ab'.repeat(32)}` as TransactionHash
  return {
    id: `10143:${transactionHash}:1`,
    chainId: 10143,
    transactionHash,
    logIndex: 1,
    blockNumber: '42',
    classification: 'SUSPICIOUS_EVENT',
    actualEmitterAddress: `0x${'22'.repeat(20)}` as HexAddress,
    expectedTokenAddress: `0x${'11'.repeat(20)}` as HexAddress,
    claimedTransfer: null,
    checks: [],
    explanation,
    analyzedAt: '2026-10-24T10:00:00.000Z',
  }
}
