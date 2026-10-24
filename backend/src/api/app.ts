import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify'
import type {
  AnalyzeTransactionRequest,
  ApiErrorResponse,
  HexAddress,
  TransactionHash,
} from '@ghostguard/shared'
import type { AnalysisService } from '../analyzer/transaction-analyzer.js'
import { TransactionNotFoundError } from '../analyzer/errors.js'
import { RpcUnavailableError } from '../watcher/rpc.js'
import { InvalidFindingsCursorError, type FindingStore } from '../watcher/store.js'
import type { FindingEventSource } from './finding-events.js'

const TRANSACTION_HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/

export interface BuildAppOptions {
  service: AnalysisService
  findings?: Pick<FindingStore, 'listFindings'>
  events?: FindingEventSource
  corsOrigins?: string[]
  logger?: boolean
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false })
  const allowedOrigins = new Set(options.corsOrigins ?? [])

  await app.register(websocket)
  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true)
        return
      }
      callback(null, false)
    },
  })

  app.get('/', async () => ({
    name: 'GhostGuard API',
    status: 'ok',
    endpoints: {
      health: '/health',
      analyze: '/api/v1/transactions/analyze',
      findings: '/api/v1/findings',
      events: '/api/v1/events',
    },
  }))

  app.setErrorHandler((error, request, reply) => {
    if (hasStatusCode(error) && error.statusCode < 500) {
      return sendError(reply, error.statusCode, 'INVALID_REQUEST', 'The request could not be parsed.', request.id)
    }

    request.log.error({ error }, 'Unhandled API error')
    return sendError(reply, 500, 'INTERNAL_ERROR', 'The request could not be completed.', request.id)
  })

  app.get('/health', async (_request, reply) => {
    const health = await options.service.health()
    return reply.code(health.status === 'ok' ? 200 : 503).send(health)
  })

  app.get('/health/live', async () => ({ status: 'ok' }))

  app.get('/api/v1/findings', async (request, reply) => {
    const parsed = parseFindingsQuery(request.query)
    if (!parsed.ok) return sendError(reply, 400, 'INVALID_REQUEST', parsed.message, request.id)
    if (!options.findings) return { items: [], nextCursor: null }

    try {
      return options.findings.listFindings(parsed.limit, parsed.cursor)
    } catch (error) {
      if (error instanceof InvalidFindingsCursorError) {
        return sendError(reply, 400, 'INVALID_REQUEST', error.message, request.id)
      }
      throw error
    }
  })

  await app.register(async function eventRoutes(routes) {
    routes.get('/api/v1/events', { websocket: true }, (socket, request) => {
      const origin = request.headers.origin
      if (origin && !allowedOrigins.has(origin)) {
        socket.close(1008, 'Origin is not allowed.')
        return
      }

      const unsubscribe = options.events?.subscribe((finding) => {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify({ type: 'finding.created', data: finding }))
        }
      }) ?? (() => {})

      socket.once('close', unsubscribe)
      socket.once('error', unsubscribe)
    })
  })

  app.post('/api/v1/transactions/analyze', async (request, reply) => {
    const parsed = parseAnalyzeRequest(request.body)
    if (!parsed.ok) return sendError(reply, 400, parsed.code, parsed.message, request.id)

    try {
      return await options.service.analyze(parsed.value)
    } catch (error) {
      if (error instanceof TransactionNotFoundError) {
        return sendError(reply, 404, 'TRANSACTION_NOT_FOUND', error.message, request.id)
      }
      if (error instanceof RpcUnavailableError) {
        request.log.warn({ error }, 'Monad RPC request failed')
        return sendError(
          reply,
          503,
          'RPC_UNAVAILABLE',
          'The configured Monad RPC endpoint is unavailable.',
          request.id,
        )
      }

      request.log.error({ error }, 'Transaction analysis failed')
      return sendError(reply, 500, 'INTERNAL_ERROR', 'The analysis could not be completed.', request.id)
    }
  })

  return app
}

type ParsedFindingsQuery =
  | { ok: true; limit: number; cursor?: string }
  | { ok: false; message: string }

function parseFindingsQuery(query: unknown): ParsedFindingsQuery {
  if (!isRecord(query)) return { ok: false, message: 'Query parameters are invalid.' }
  const rawLimit = query.limit
  const limit = rawLimit === undefined ? 20 : Number(rawLimit)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return { ok: false, message: 'Limit must be an integer between 1 and 100.' }
  }

  const rawCursor = query.cursor
  if (rawCursor !== undefined && (typeof rawCursor !== 'string' || rawCursor.length === 0)) {
    return { ok: false, message: 'Cursor must be a non-empty string.' }
  }

  return { ok: true, limit, ...(typeof rawCursor === 'string' ? { cursor: rawCursor } : {}) }
}

type ParsedRequest =
  | { ok: true; value: AnalyzeTransactionRequest }
  | { ok: false; code: 'INVALID_TRANSACTION_HASH' | 'INVALID_REQUEST'; message: string }

function parseAnalyzeRequest(body: unknown): ParsedRequest {
  if (!isRecord(body)) {
    return { ok: false, code: 'INVALID_REQUEST', message: 'Request body must be a JSON object.' }
  }

  const transactionHash = body.transactionHash
  if (typeof transactionHash !== 'string' || !TRANSACTION_HASH_PATTERN.test(transactionHash)) {
    return { ok: false, code: 'INVALID_TRANSACTION_HASH', message: 'Transaction hash must be 32 bytes.' }
  }

  const expectedTokenAddress = body.expectedTokenAddress
  if (expectedTokenAddress !== undefined
    && (typeof expectedTokenAddress !== 'string' || !ADDRESS_PATTERN.test(expectedTokenAddress))) {
    return { ok: false, code: 'INVALID_REQUEST', message: 'Expected token address must be 20 bytes.' }
  }

  return {
    ok: true,
    value: {
      transactionHash: transactionHash as TransactionHash,
      ...(expectedTokenAddress
        ? { expectedTokenAddress: expectedTokenAddress as HexAddress }
        : {}),
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasStatusCode(value: unknown): value is { statusCode: number } {
  return isRecord(value) && typeof value.statusCode === 'number'
}

function sendError(
  reply: FastifyReply,
  status: number,
  code: ApiErrorResponse['error']['code'],
  message: string,
  requestId: string,
): FastifyReply {
  return reply.code(status).send({ error: { code, message, requestId } })
}
