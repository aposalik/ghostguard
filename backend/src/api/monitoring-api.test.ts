import { afterEach, describe, expect, it } from 'vitest'
import type {
  AccountActivitiesPage,
  AccountActivity,
  AnalyzeTransactionRequest,
  AnalyzeTransactionResponse,
  HealthResponse,
  HexAddress,
  SecurityFinding,
  TransactionHash,
} from '@ghostguard/shared'
import type { FastifyInstance } from 'fastify'
import type { AnalysisService } from '../analyzer/transaction-analyzer.js'
import type { FindingStore } from '../watcher/store.js'
import { buildApp } from './app.js'
import type {
  AccountActivityListener,
  FindingEventSource,
  FindingListener,
} from './finding-events.js'

const TX_HASH = `0x${'ab'.repeat(32)}` as TransactionHash
const apps: FastifyInstance[] = []

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
})

describe('account monitoring API', () => {
  it('enables account Agent Mode and returns the durable watch record', async () => {
    const monitoring = new FakeMonitoring()
    const address = `0x${'AA'.repeat(20)}`
    const app = await createApp({ monitoring })
    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/monitoring/accounts/${address}`,
      payload: { enabled: true },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      chainId: 10143,
      address: address.toLowerCase(),
      enabled: true,
    })
    expect(monitoring.lastWatchUpdate).toEqual({
      chainId: 10143,
      address: address.toLowerCase(),
      enabled: true,
    })
  })

  it('lists persisted activities for one monitored account', async () => {
    const monitoring = new FakeMonitoring()
    const activity = createActivity()
    monitoring.activities = { items: [activity], nextCursor: 'older' }
    const app = await createApp({ monitoring })
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/monitoring/accounts/${activity.watchedAddress}/activities?limit=7&cursor=page`,
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ items: [activity], nextCursor: 'older' })
    expect(monitoring.lastActivityRequest).toEqual({
      chainId: 10143,
      address: activity.watchedAddress,
      limit: 7,
      cursor: 'page',
    })
  })

  it('rejects invalid account addresses and Agent Mode payloads', async () => {
    const app = await createApp({ monitoring: new FakeMonitoring() })
    const invalidAddress = await app.inject({
      method: 'PUT',
      url: '/api/v1/monitoring/accounts/0x1234',
      payload: { enabled: true },
    })
    const invalidPayload = await app.inject({
      method: 'PUT',
      url: `/api/v1/monitoring/accounts/0x${'11'.repeat(20)}`,
      payload: { enabled: 'yes' },
    })

    expect(invalidAddress.statusCode).toBe(400)
    expect(invalidAddress.json().error.code).toBe('INVALID_ACCOUNT_ADDRESS')
    expect(invalidPayload.statusCode).toBe(400)
    expect(invalidPayload.json().error.code).toBe('INVALID_REQUEST')
  })

  it('streams newly stored account activities over the WebSocket endpoint', async () => {
    const events = new FakeEvents()
    const app = await createApp({ events })
    await app.ready()
    const socket = await app.injectWS('/api/v1/events', {
      headers: { origin: 'http://localhost:5173' },
    })
    const message = new Promise<string>((resolve) => socket.once('message', (data) => resolve(data.toString())))
    const activity = createActivity()

    await events.activitySubscribed
    events.publishActivity(activity)

    await expect(message).resolves.toBe(JSON.stringify({ type: 'activity.created', data: activity }))
    socket.close()
  })
})

class FakeService implements AnalysisService {
  async health(): Promise<HealthResponse> {
    return { status: 'ok', chainId: 10143, latestIndexedBlock: null }
  }

  async analyze(request: AnalyzeTransactionRequest): Promise<AnalyzeTransactionResponse> {
    return {
      transaction: {
        chainId: 10143,
        transactionHash: request.transactionHash,
        receiptStatus: 'SUCCESS',
        blockNumber: '42',
      },
      findings: [],
    }
  }
}

class FakeEvents implements FindingEventSource {
  private findingListener: FindingListener | null = null
  private activityListener: AccountActivityListener | null = null
  private resolveActivitySubscribed: (() => void) | null = null
  readonly activitySubscribed = new Promise<void>((resolve) => {
    this.resolveActivitySubscribed = resolve
  })

  subscribe(listener: FindingListener): () => void {
    this.findingListener = listener
    return () => {
      this.findingListener = null
    }
  }

  subscribeActivity(listener: AccountActivityListener): () => void {
    this.activityListener = listener
    this.resolveActivitySubscribed?.()
    return () => {
      this.activityListener = null
    }
  }

  publishActivity(activity: AccountActivity): void {
    this.activityListener?.(activity)
  }
}

class FakeMonitoring implements Pick<
  FindingStore,
  'upsertAccountWatch' | 'listAccountWatches' | 'listAccountActivities'
> {
  activities: AccountActivitiesPage = { items: [], nextCursor: null }
  lastWatchUpdate: { chainId: number; address: HexAddress; enabled: boolean } | null = null
  lastActivityRequest: {
    chainId: number
    address: HexAddress
    limit: number
    cursor?: string
  } | null = null

  upsertAccountWatch(chainId: number, address: HexAddress, enabled: boolean) {
    this.lastWatchUpdate = { chainId, address, enabled }
    return {
      chainId,
      address,
      enabled,
      createdAt: '2026-10-25T00:00:00.000Z',
      updatedAt: '2026-10-25T00:00:00.000Z',
    }
  }

  listAccountWatches() {
    return []
  }

  listAccountActivities(chainId: number, address: HexAddress, limit: number, cursor?: string) {
    this.lastActivityRequest = { chainId, address, limit, ...(cursor ? { cursor } : {}) }
    return this.activities
  }
}

interface CreateAppOptions {
  monitoring?: Pick<
    FindingStore,
    'upsertAccountWatch' | 'listAccountWatches' | 'listAccountActivities'
  >
  events?: FindingEventSource
}

async function createApp(options: CreateAppOptions): Promise<FastifyInstance> {
  const app = await buildApp({
    service: new FakeService(),
    monitoring: options.monitoring,
    events: options.events,
    corsOrigins: ['http://localhost:5173'],
  })
  apps.push(app)
  return app
}

function createActivity(): AccountActivity {
  const watchedAddress = `0x${'aa'.repeat(20)}` as HexAddress
  return {
    id: '10143:activity:1',
    chainId: 10143,
    watchedAddress,
    transactionHash: TX_HASH,
    blockNumber: '42',
    direction: 'INCOMING',
    kind: 'TOKEN_TRANSFER',
    verdict: 'CONFIRMED',
    counterpartyAddress: `0x${'bb'.repeat(20)}` as HexAddress,
    assetAddress: `0x${'11'.repeat(20)}` as HexAddress,
    amount: '25',
    finding: createFinding(watchedAddress),
    observedAt: '2026-10-25T00:00:00.000Z',
  }
}

function createFinding(watchedAddress: HexAddress): SecurityFinding {
  return {
    id: `10143:${TX_HASH}:2`,
    chainId: 10143,
    transactionHash: TX_HASH,
    logIndex: 2,
    blockNumber: '42',
    classification: 'VERIFIED_DEMO_TRANSFER',
    actualEmitterAddress: `0x${'11'.repeat(20)}` as HexAddress,
    expectedTokenAddress: `0x${'11'.repeat(20)}` as HexAddress,
    claimedTransfer: {
      from: `0x${'bb'.repeat(20)}` as HexAddress,
      to: watchedAddress,
      amount: '25',
    },
    checks: [],
    explanation: 'Trusted token transfer.',
    analyzedAt: '2026-10-25T00:00:00.000Z',
  }
}
