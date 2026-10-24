import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  analyzeTransaction,
  checkBackendHealth,
  fetchAccountActivities,
  fetchAgentStatus,
  fetchMonitoredAccounts,
  fetchRecentFindings,
  getEventsWsUrl,
  isAccountAddress,
  isTransactionHash,
  setAccountMonitoring,
  type AnalysisRequest,
  type AnalysisResponse,
} from './api'

describe('transaction hash validation', () => {
  it('accepts exactly 32 bytes of hex with 0x prefix', () => {
    expect(isTransactionHash(`0x${'a1'.repeat(32)}`)).toBe(true)
    expect(isTransactionHash('0x24a1bf7a8b6d8194c730e18103c81e5f8a02a4bf74d4715fbcde3c87a51801f4')).toBe(true)
  })

  it('rejects malformed hashes (length, prefix, characters)', () => {
    expect(isTransactionHash('0x1234')).toBe(false)
    expect(isTransactionHash(`${'a1'.repeat(32)}`)).toBe(false) // missing 0x
    expect(isTransactionHash(`0x${'zz'.repeat(32)}`)).toBe(false) // non-hex
    expect(isTransactionHash(`0x${'a1'.repeat(33)}`)).toBe(false) // too long
  })

  it('validates hash client-side and throws before network request if invalid', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    await expect(
      analyzeTransaction({ transactionHash: '0xinvalid' as `0x${string}` }),
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'INVALID_TRANSACTION_HASH',
        status: 400,
      }),
    )

    // Ensure no network request was fired
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('analyzeTransaction - error diagnostics & status codes', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('handles HTTP 400 invalid hash from server', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'INVALID_TRANSACTION_HASH',
            message: 'Transaction hash must be 32 bytes.',
            requestId: 'req-400',
          },
        }),
      }),
    )

    await expect(analyzeTransaction({ transactionHash: `0x${'b2'.repeat(32)}` })).rejects.toEqual(
      expect.objectContaining({
        status: 400,
        code: 'INVALID_TRANSACTION_HASH',
        message: 'Transaction hash must be 32 bytes.',
      }),
    )
  })

  it('handles HTTP 404 transaction not found on Monad Testnet', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            code: 'TRANSACTION_NOT_FOUND',
            message: 'Transaction was not found on Monad Testnet. Verify the hash on Monad Explorer.',
            requestId: 'req-404',
          },
        }),
      }),
    )

    await expect(analyzeTransaction({ transactionHash: `0x${'c3'.repeat(32)}` })).rejects.toEqual(
      expect.objectContaining({
        status: 404,
        code: 'TRANSACTION_NOT_FOUND',
        message: expect.stringContaining('not found on Monad Testnet'),
      }),
    )
  })

  it('handles HTTP 502/503 Monad RPC service issues', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          error: {
            code: 'RPC_UNAVAILABLE',
            message: 'Monad RPC node unavailable.',
            requestId: 'req-503',
          },
        }),
      }),
    )

    await expect(analyzeTransaction({ transactionHash: `0x${'d4'.repeat(32)}` })).rejects.toEqual(
      expect.objectContaining({
        status: 503,
        code: 'RPC_UNAVAILABLE',
      }),
    )
  })

  it('handles network disconnects with friendly diagnostic message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(analyzeTransaction({ transactionHash: `0x${'e5'.repeat(32)}` })).rejects.toEqual(
      expect.objectContaining({
        code: 'NETWORK_DISCONNECTED',
        status: 0,
        message: expect.stringContaining('GhostGuard backend is not reachable'),
      }),
    )
  })
})

describe('analyzeTransaction - real backend responses only', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('parses valid backend AnalysisResponse correctly when online', async () => {
    const mockResponse: AnalysisResponse = {
      transaction: {
        chainId: 10143,
        transactionHash: `0x${'11'.repeat(32)}`,
        receiptStatus: 'SUCCESS',
        blockNumber: '123456',
      },
      findings: [
        {
          id: `10143:0x${'11'.repeat(32)}:0`,
          chainId: 10143,
          transactionHash: `0x${'11'.repeat(32)}`,
          logIndex: 0,
          blockNumber: '123456',
          classification: 'VERIFIED_DEMO_TRANSFER',
          actualEmitterAddress: '0x71C8A18E66c6b22bBEaE9D5763529D7dD69c8a14',
          expectedTokenAddress: '0x71C8A18E66c6b22bBEaE9D5763529D7dD69c8a14',
          claimedTransfer: null,
          checks: [],
          explanation: 'Verified transfer.',
          analyzedAt: '2026-10-24T12:00:00.000Z',
        },
      ],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      }),
    )

    const req: AnalysisRequest = { transactionHash: `0x${'11'.repeat(32)}` }
    const result = await analyzeTransaction(req)

    expect(result.transaction.transactionHash).toBe(`0x${'11'.repeat(32)}`)
    expect(result.findings[0]?.classification).toBe('VERIFIED_DEMO_TRANSFER')
  })

  it('does not invent a verified result when the backend is offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')))

    await expect(analyzeTransaction({ transactionHash: `0x${'22'.repeat(32)}` })).rejects.toEqual(
      expect.objectContaining({ code: 'NETWORK_DISCONNECTED' }),
    )
  })
})

describe('checkBackendHealth', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns health payload when server is reachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'ok',
          chainId: 10143,
          latestIndexedBlock: '1849280',
        }),
      }),
    )

    const health = await checkBackendHealth()
    expect(health.status).toBe('ok')
    expect(health.chainId).toBe(10143)
  })

  it('throws ApiRequestError when health endpoint is offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(checkBackendHealth()).rejects.toEqual(
      expect.objectContaining({
        code: 'NETWORK_DISCONNECTED',
        status: 0,
      }),
    )
  })
})

describe('getEventsWsUrl', () => {
  it('returns valid ws/wss events endpoint URL based on environment or fallback', () => {
    const wsUrl = getEventsWsUrl()
    expect(wsUrl).toMatch(/^wss?:\/\/.*\/api\/v1\/events$/)
  })
})

describe('fetchRecentFindings', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches recent findings page successfully', async () => {
    const mockFindingsPage = {
      items: [{
        id: `10143:0x${'11'.repeat(32)}:0`,
        chainId: 10143,
        transactionHash: `0x${'11'.repeat(32)}`,
        logIndex: 0,
        blockNumber: '123456',
        classification: 'VERIFIED_DEMO_TRANSFER',
        actualEmitterAddress: `0x${'aa'.repeat(20)}`,
        expectedTokenAddress: `0x${'aa'.repeat(20)}`,
        claimedTransfer: null,
        checks: [],
        explanation: 'Live finding.',
        analyzedAt: '2026-10-24T12:00:00.000Z',
      }],
      nextCursor: null,
      totalCount: 1,
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockFindingsPage,
      }),
    )

    const result = await fetchRecentFindings(10)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.classification).toBe('VERIFIED_DEMO_TRANSFER')
  })

  it('throws ApiRequestError when findings endpoint fails with HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    )

    await expect(fetchRecentFindings()).rejects.toEqual(
      expect.objectContaining({
        status: 500,
      }),
    )
  })

  it('throws ApiRequestError when findings endpoint is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(fetchRecentFindings()).rejects.toEqual(
      expect.objectContaining({
        code: 'NETWORK_DISCONNECTED',
        status: 0,
      }),
    )
  })
})

describe('fetchAgentStatus', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches the live producer and detector status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        producer: { enabled: false, state: 'disabled', submitted: 0 },
        detector: { enabled: true, state: 'running', findingsStored: 2 },
      }),
    }))

    const status = await fetchAgentStatus()
    expect(status.producer.state).toBe('disabled')
    expect(status.detector.state).toBe('running')
  })
})

describe('account monitoring API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('validates 20-byte account addresses before making requests', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    expect(isAccountAddress(`0x${'a1'.repeat(20)}`)).toBe(true)
    expect(isAccountAddress('0x1234')).toBe(false)
    await expect(setAccountMonitoring('0x1234', true)).rejects.toEqual(
      expect.objectContaining({ code: 'INVALID_ACCOUNT_ADDRESS', status: 400 }),
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('enables Agent Mode using an idempotent watch update', async () => {
    const address = `0x${'A1'.repeat(20)}`
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        chainId: 10143,
        address: address.toLowerCase(),
        enabled: true,
        createdAt: '2026-10-25T00:00:00.000Z',
        updatedAt: '2026-10-25T00:00:00.000Z',
      }),
    })
    vi.stubGlobal('fetch', fetchSpy)

    const watch = await setAccountMonitoring(address, true)

    expect(watch.enabled).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining(`/api/v1/monitoring/accounts/${address.toLowerCase()}`),
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ enabled: true }) }),
    )
  })

  it('loads monitored accounts and durable account activity pages', async () => {
    const address = `0x${'a1'.repeat(20)}`
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [], nextCursor: 'older' }),
      })
    vi.stubGlobal('fetch', fetchSpy)

    await expect(fetchMonitoredAccounts()).resolves.toEqual([])
    await expect(fetchAccountActivities(address, 30, 'page')).resolves.toEqual({
      items: [],
      nextCursor: 'older',
    })
    expect(String(fetchSpy.mock.calls[1]?.[0])).toContain(
      `/api/v1/monitoring/accounts/${address}/activities?limit=30&cursor=page`,
    )
  })
})
