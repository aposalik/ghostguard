import type {
  AccountActivitiesPage,
  AccountActivity,
  AgentStatusResponse,
  AnalyzeTransactionRequest,
  AnalyzeTransactionResponse,
  ApiErrorResponse,
  FindingsPage,
  HealthResponse,
  HexAddress,
  MonitoredAccount,
  SecurityFinding,
  TransactionHash,
} from '@ghostguard/shared'

export type AnalysisRequest = AnalyzeTransactionRequest
export type AnalysisResponse = AnalyzeTransactionResponse

export interface WsFindingCreatedMessage {
  type: 'finding.created'
  data: SecurityFinding
}

export interface WsActivityCreatedMessage {
  type: 'activity.created'
  data: AccountActivity
}

export type WsEventMessage = WsFindingCreatedMessage | WsActivityCreatedMessage

export const DEFAULT_API_BASE_URL = import.meta.env.PROD
  ? ''
  : 'http://localhost:3000'
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ??
  (typeof window !== 'undefined' && window.location.pathname.startsWith('/api') ? '/api' : DEFAULT_API_BASE_URL)
).replace(/\/$/, '')

export function getEventsWsUrl(): string {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL
  }

  // Convert http/https to ws/wss
  if (API_BASE_URL.startsWith('https://')) {
    return API_BASE_URL.replace(/^https:\/\//, 'wss://') + '/api/v1/events'
  }
  if (API_BASE_URL.startsWith('http://')) {
    return API_BASE_URL.replace(/^http:\/\//, 'ws://') + '/api/v1/events'
  }

  // Relative path fallback (e.g. proxy)
  const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3001'
  return `${protocol}//${host}/api/v1/events`
}

export const TRANSACTION_HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/
export const ACCOUNT_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/

export class ApiRequestError extends Error {
  readonly status: number
  readonly code: string
  readonly diagnostic: string

  constructor(message: string, status: number, code = 'INTERNAL_ERROR', diagnostic?: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
    this.diagnostic = diagnostic ?? message
  }
}

export function isTransactionHash(value: string): value is TransactionHash {
  return TRANSACTION_HASH_PATTERN.test(value.trim())
}

export function isAccountAddress(value: string): value is HexAddress {
  return ACCOUNT_ADDRESS_PATTERN.test(value.trim())
}

function mapHttpError(status: number, serverMessage?: string, serverCode?: string): { message: string; code: string } {
  if (serverMessage && serverCode) {
    return { message: serverMessage, code: serverCode }
  }

  switch (status) {
    case 400:
      return {
        message: 'Invalid transaction hash format. Ensure it starts with 0x and contains exactly 64 hexadecimal characters (32 bytes).',
        code: 'INVALID_TRANSACTION_HASH',
      }
    case 404:
      return {
        message: 'Transaction was not found on Monad Testnet. Verify the hash on Monad Explorer.',
        code: 'TRANSACTION_NOT_FOUND',
      }
    case 502:
    case 503:
      return {
        message: 'Monad RPC service unavailable. Node connection timed out or is syncing.',
        code: 'RPC_UNAVAILABLE',
      }
    default:
      return {
        message: serverMessage ?? `Analysis request failed with HTTP ${status}.`,
        code: serverCode ?? 'INTERNAL_ERROR',
      }
  }
}

export async function analyzeTransaction(
  request: AnalyzeTransactionRequest,
): Promise<AnalyzeTransactionResponse> {
  const trimmedHash = request.transactionHash.trim()

  // 1. Client-side hash validation before firing network request
  if (!isTransactionHash(trimmedHash)) {
    throw new ApiRequestError(
      'Invalid transaction hash format. Ensure it starts with 0x and contains exactly 64 hexadecimal characters.',
      400,
      'INVALID_TRANSACTION_HASH',
      'The entered hash does not conform to the 32-byte hex standard required by Monad RPC.',
    )
  }

  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/transactions/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        transactionHash: trimmedHash,
        expectedTokenAddress: request.expectedTokenAddress,
      }),
    })
  } catch {
    throw new ApiRequestError(
      'The GhostGuard backend is not reachable. Network disconnected or server offline.',
      0,
      'NETWORK_DISCONNECTED',
      'Unable to connect to the analyzer backend at ' + API_BASE_URL + '. Check your network connection or backend service.',
    )
  }

  if (!response.ok) {
    const payload = await readError(response)
    const err = mapHttpError(response.status, payload?.error?.message, payload?.error?.code)
    throw new ApiRequestError(err.message, response.status, err.code)
  }

  try {
    return (await response.json()) as AnalyzeTransactionResponse
  } catch {
    throw new ApiRequestError(
      'Malformed response from analyzer backend. Could not parse JSON payload.',
      500,
      'INTERNAL_ERROR',
    )
  }
}

export async function fetchAgentStatus(): Promise<AgentStatusResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/status`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new ApiRequestError(`Failed to fetch agent status with HTTP ${response.status}`, response.status)
    }
    return (await response.json()) as AgentStatusResponse
  } catch (cause) {
    if (cause instanceof ApiRequestError) throw cause
    throw new ApiRequestError('The GhostGuard agents are not reachable.', 0, 'NETWORK_DISCONNECTED')
  }
}

export async function checkBackendHealth(): Promise<HealthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new ApiRequestError(`Health check failed with HTTP ${response.status}`, response.status, 'RPC_UNAVAILABLE')
    }

    return (await response.json()) as HealthResponse
  } catch (cause) {
    if (cause instanceof ApiRequestError) throw cause
    throw new ApiRequestError(
      'The GhostGuard backend is not reachable. Network disconnected or service offline.',
      0,
      'NETWORK_DISCONNECTED',
    )
  }
}

export async function fetchRecentFindings(limit = 20, cursor?: string): Promise<FindingsPage> {
  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const url = new URL(`${API_BASE_URL}/api/v1/findings`, browserOrigin)
  url.searchParams.set('limit', String(limit))
  if (cursor) {
    url.searchParams.set('cursor', cursor)
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new ApiRequestError(`Failed to fetch findings with HTTP ${response.status}`, response.status)
    }

    return (await response.json()) as FindingsPage
  } catch (cause) {
    if (cause instanceof ApiRequestError) throw cause
    throw new ApiRequestError(
      'The GhostGuard backend is not reachable for findings feed.',
      0,
      'NETWORK_DISCONNECTED',
    )
  }
}

export async function fetchMonitoredAccounts(): Promise<MonitoredAccount[]> {
  return fetchMonitoringJson<MonitoredAccount[]>('/api/v1/monitoring/accounts')
}

export async function setAccountMonitoring(address: string, enabled: boolean): Promise<MonitoredAccount> {
  const normalizedAddress = address.trim().toLowerCase()
  if (!isAccountAddress(normalizedAddress)) {
    throw new ApiRequestError(
      'Account address must start with 0x and contain exactly 40 hexadecimal characters.',
      400,
      'INVALID_ACCOUNT_ADDRESS',
    )
  }

  return fetchMonitoringJson<MonitoredAccount>(
    `/api/v1/monitoring/accounts/${normalizedAddress}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ enabled }),
    },
  )
}

export async function fetchAccountActivities(
  address: string,
  limit = 50,
  cursor?: string,
): Promise<AccountActivitiesPage> {
  const normalizedAddress = address.trim().toLowerCase()
  if (!isAccountAddress(normalizedAddress)) {
    throw new ApiRequestError(
      'Account address must start with 0x and contain exactly 40 hexadecimal characters.',
      400,
      'INVALID_ACCOUNT_ADDRESS',
    )
  }

  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  const url = new URL(
    `${API_BASE_URL}/api/v1/monitoring/accounts/${normalizedAddress}/activities`,
    browserOrigin,
  )
  url.searchParams.set('limit', String(limit))
  if (cursor) url.searchParams.set('cursor', cursor)
  return fetchMonitoringJson<AccountActivitiesPage>(url.toString())
}

async function fetchMonitoringJson<T>(pathOrUrl: string, init?: RequestInit): Promise<T> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_BASE_URL}${pathOrUrl}`
  try {
    const response = await fetch(url, init ?? { method: 'GET', headers: { Accept: 'application/json' } })
    if (!response.ok) {
      const payload = await readError(response)
      throw new ApiRequestError(
        payload?.error.message ?? `Monitoring request failed with HTTP ${response.status}.`,
        response.status,
        payload?.error.code ?? 'INTERNAL_ERROR',
      )
    }
    return (await response.json()) as T
  } catch (cause) {
    if (cause instanceof ApiRequestError) throw cause
    throw new ApiRequestError(
      'The GhostGuard account monitor is not reachable.',
      0,
      'NETWORK_DISCONNECTED',
    )
  }
}

async function readError(response: Response): Promise<ApiErrorResponse | null> {
  try {
    return (await response.json()) as ApiErrorResponse
  } catch {
    return null
  }
}
