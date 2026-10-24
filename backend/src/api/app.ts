import cors from '@fastify/cors'
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

const TRANSACTION_HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/

export interface BuildAppOptions {
  service: AnalysisService
  corsOrigins?: string[]
  logger?: boolean
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false })
  const allowedOrigins = new Set(options.corsOrigins ?? [])

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true)
        return
      }
      callback(null, false)
    },
  })

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
