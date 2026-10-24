import { afterEach, describe, expect, it } from 'vitest'
import type {
  AnalyzeTransactionRequest,
  AnalyzeTransactionResponse,
  FindingsPage,
  HealthResponse,
  HexAddress,
  SecurityFinding,
  TransactionHash,
} from '@ghostguard/shared'
import type { FastifyInstance } from 'fastify'
import { buildApp } from './app.js'
import type { FindingEventSource, FindingListener } from './finding-events.js'
import type { AnalysisService } from '../analyzer/transaction-analyzer.js'
import { TransactionNotFoundError } from '../analyzer/errors.js'
import { RpcUnavailableError } from '../watcher/rpc.js'
import { InvalidFindingsCursorError, type FindingStore } from '../watcher/store.js'

const TX_HASH = `0x${'ab'.repeat(32)}` as TransactionHash
const apps: FastifyInstance[] = []

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
})

describe('GhostGuard API', () => {
  it('describes the service at the public root URL', async () => {
    const app = await createApp(new FakeService())
    const response = await app.inject({ method: 'GET', url: '/' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      name: 'GhostGuard API',
      status: 'ok',
      endpoints: { health: '/health', findings: '/api/v1/findings' },
    })
  })

  it('provides an RPC-independent liveness endpoint for the hosting platform', async () => {
    const app = await createApp(new FakeService({ status: 'degraded', chainId: 0, latestIndexedBlock: null }))
    const response = await app.inject({ method: 'GET', url: '/health/live' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })

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

  it('returns persisted findings with cursor pagination metadata', async () => {
    const finding = createFinding()
    const findings = new FakeFindings({ items: [finding], nextCursor: 'next-page' })
    const app = await createApp(new FakeService(), { findings })
    const response = await app.inject({ method: 'GET', url: '/api/v1/findings?limit=5&cursor=current-page' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ items: [finding], nextCursor: 'next-page' })
    expect(findings.lastRequest).toEqual({ limit: 5, cursor: 'current-page' })
  })

  it('rejects invalid findings pagination input with the canonical error shape', async () => {
    const app = await createApp(new FakeService())
    const response = await app.inject({ method: 'GET', url: '/api/v1/findings?limit=101' })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      error: { code: 'INVALID_REQUEST', message: 'Limit must be an integer between 1 and 100.' },
    })
  })

  it('maps invalid opaque findings cursors to a 400 response', async () => {
    const findings = new FakeFindings({ items: [], nextCursor: null })
    findings.error = new InvalidFindingsCursorError()
    const app = await createApp(new FakeService(), { findings })
    const response = await app.inject({ method: 'GET', url: '/api/v1/findings?cursor=invalid' })

    expect(response.statusCode).toBe(400)
    expect(response.json().error).toMatchObject({
      code: 'INVALID_REQUEST',
      message: 'The findings cursor is invalid.',
    })
  })

  it('streams newly stored findings over the WebSocket endpoint', async () => {
    const events = new FakeEvents()
    const app = await createApp(new FakeService(), { events })
    await app.ready()
    const socket = await app.injectWS('/api/v1/events', {
      headers: { origin: 'http://localhost:5173' },
    })
    const message = new Promise<string>((resolve) => socket.once('message', (data) => resolve(data.toString())))
    const finding = createFinding()

    await events.subscribed
    events.publish(finding)

    await expect(message).resolves.toBe(JSON.stringify({ type: 'finding.created', data: finding }))
    socket.close()
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

class FakeEvents implements FindingEventSource {
  private listener: FindingListener | null = null
  private resolveSubscribed: (() => void) | null = null
  readonly subscribed = new Promise<void>((resolve) => {
    this.resolveSubscribed = resolve
  })

  subscribe(listener: FindingListener): () => void {
    this.listener = listener
    this.resolveSubscribed?.()
    return () => {
      this.listener = null
    }
  }

  publish(finding: SecurityFinding): void {
    this.listener?.(finding)
  }
}

class FakeFindings implements Pick<FindingStore, 'listFindings'> {
  lastRequest: { limit: number; cursor?: string } | null = null
  error: Error | null = null
  private readonly response: FindingsPage

  constructor(response: FindingsPage) {
    this.response = response
  }

  listFindings(limit: number, cursor?: string): FindingsPage {
    this.lastRequest = { limit, ...(cursor ? { cursor } : {}) }
    if (this.error) throw this.error
    return this.response
  }
}

function createFinding(): SecurityFinding {
  return {
    id: `10143:${TX_HASH}:2`,
    chainId: 10143,
    transactionHash: TX_HASH,
    logIndex: 2,
    blockNumber: '73787276',
    classification: 'SUSPICIOUS_EVENT',
    actualEmitterAddress: `0x${'22'.repeat(20)}` as HexAddress,
    expectedTokenAddress: `0x${'11'.repeat(20)}` as HexAddress,
    claimedTransfer: null,
    checks: [],
    explanation: 'Controlled suspicious event.',
    analyzedAt: '2026-10-24T13:10:00.000Z',
  }
}

interface CreateAppOptions {
  findings?: Pick<FindingStore, 'listFindings'>
  events?: FindingEventSource
}

async function createApp(service: AnalysisService, options: CreateAppOptions = {}): Promise<FastifyInstance> {
  const app = await buildApp({
    service,
    findings: options.findings,
    events: options.events,
    corsOrigins: ['http://localhost:5173'],
  })
  apps.push(app)
  return app
}
