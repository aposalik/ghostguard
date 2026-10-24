import type {
  AnalyzeTransactionRequest,
  AnalyzeTransactionResponse,
  ApiErrorResponse,
  TransactionHash,
} from '@ghostguard/shared'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const TRANSACTION_HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/

export class ApiRequestError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
  }
}

export function isTransactionHash(value: string): value is TransactionHash {
  return TRANSACTION_HASH_PATTERN.test(value)
}

export async function analyzeTransaction(request: AnalyzeTransactionRequest): Promise<AnalyzeTransactionResponse> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/transactions/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
  } catch {
    throw new ApiRequestError('The GhostGuard backend is not reachable. No security verdict was produced.', 0, 'NETWORK_ERROR')
  }

  if (!response.ok) {
    const payload = await readError(response)
    throw new ApiRequestError(payload?.error.message ?? `Analysis request failed with HTTP ${response.status}.`, response.status, payload?.error.code)
  }

  return response.json() as Promise<AnalyzeTransactionResponse>
}

async function readError(response: Response): Promise<ApiErrorResponse | null> {
  try {
    return await response.json() as ApiErrorResponse
  } catch {
    return null
  }
}
