import { afterEach, describe, expect, it } from 'vitest'
import type {
  AnalyzeTransactionRequest,
  AnalyzeTransactionResponse,
  HealthResponse,
  TransactionHash,
} from '@ghostguard/shared'
import type { FastifyInstance } from 'fastify'
import { buildApp } from './app.js'
import type { AnalysisService } from '../analyzer/transaction-analyzer.js'
import { TransactionNotFoundError } from '../analyzer/errors.js'
import { RpcUnavailableError } from '../watcher/rpc.js'

const TX_HASH = `0x${'ab'.repeat(32)}` as TransactionHash
const apps: FastifyInstance[] = []

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
})

describe('GhostGuard API', () => {
  it('reports healthy RPC state', async () => {
    const app = await createApp(new FakeService())
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok', chainId: 1, latestIndexedBlock: null })
  })

  it('returns 503 for degraded health without leaking internal errors', async () => {
    const app = await createApp(new FakeService({ status: 'degraded', chainId: 0, latestIndexedBlock: null }))
    const response = await app.inject({ method: 'GET', url: '/health' })

    expect(response.statusCode).toBe(503)
    expect(response.json()).toEqual({ status: 'degraded', chainId: 0, latestIndexedBlock: null })
  })

  it('rejects malformed transaction hashes with the canonical error shape', async () => {
    const app = await createApp(new FakeService())
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions/analyze',
      payload: { transactionHash: '0x1234' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      error: {
        code: 'INVALID_TRANSACTION_HASH',
        message: 'Transaction hash must be 32 bytes.',
      },
    })
    expect(response.json().error.requestId).toEqual(expect.any(String))
  })

  it('returns the canonical error shape for malformed JSON', async () => {
    const app = await createApp(new FakeService())
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions/analyze',
      headers: { 'content-type': 'application/json' },
      payload: '{"transactionHash":',
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ error: { code: 'INVALID_REQUEST' } })
  })

  it('passes a valid request to the analyzer service', async () => {
    const service = new FakeService()
    const app = await createApp(service)
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions/analyze',
      payload: { transactionHash: TX_HASH },
    })

    expect(response.statusCode).toBe(200)
    expect(service.lastRequest).toEqual({ transactionHash: TX_HASH })
    expect(response.json().transaction.transactionHash).toBe(TX_HASH)
  })

  it('maps missing receipts to a 404 API error', async () => {
    const service = new FakeService()
    service.analysisError = new TransactionNotFoundError()
    const app = await createApp(service)
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions/analyze',
      payload: { transactionHash: TX_HASH },
    })

    expect(response.statusCode).toBe(404)
    expect(response.json().error.code).toBe('TRANSACTION_NOT_FOUND')
  })

  it('maps RPC failures to a 503 API error', async () => {
    const service = new FakeService()
    service.analysisError = new RpcUnavailableError('RPC is unavailable.')
    const app = await createApp(service)
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/transactions/analyze',
      payload: { transactionHash: TX_HASH },
    })

    expect(response.statusCode).toBe(503)
    expect(response.json().error).toMatchObject({
      code: 'RPC_UNAVAILABLE',
      message: 'The configured Monad RPC endpoint is unavailable.',
    })
  })

  it('allows only configured browser origins', async () => {
    const app = await createApp(new FakeService())
    const allowed = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'GET',
      },
    })
    const denied = await app.inject({
      method: 'OPTIONS',
      url: '/health',
      headers: {
        origin: 'https://untrusted.example',
        'access-control-request-method': 'GET',
      },
    })

    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173')
    expect(denied.headers['access-control-allow-origin']).toBeUndefined()
  })
})

class FakeService implements AnalysisService {
  lastRequest: AnalyzeTransactionRequest | null = null
  analysisError: Error | null = null
  private readonly healthResponse: HealthResponse

  constructor(healthResponse: HealthResponse = {
    status: 'ok',
    chainId: 1,
    latestIndexedBlock: null,
  }) {
    this.healthResponse = healthResponse
  }

  async health(): Promise<HealthResponse> {
    return this.healthResponse
  }

  async analyze(request: AnalyzeTransactionRequest): Promise<AnalyzeTransactionResponse> {
    this.lastRequest = request
    if (this.analysisError) throw this.analysisError
    return {
      transaction: {
        chainId: 1,
        transactionHash: request.transactionHash,
        receiptStatus: 'SUCCESS',
        blockNumber: '42',
      },
      findings: [],
    }
  }
}

async function createApp(service: AnalysisService): Promise<FastifyInstance> {
  const app = await buildApp({ service, corsOrigins: ['http://localhost:5173'] })
  apps.push(app)
  return app
}
