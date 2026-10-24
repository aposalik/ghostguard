import type { HexAddress } from '@ghostguard/shared'

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/

export interface BackendConfig {
  host: string
  port: number
  rpcUrl: string
  rpcTimeoutMs: number
  trustedDemoTokenAddress?: HexAddress
  demoEventOnlyAddress?: HexAddress
  corsOrigins: string[]
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BackendConfig {
  const rpcUrl = requiredUrl(env.MONAD_RPC_URL, 'MONAD_RPC_URL')

  return {
    host: env.HOST?.trim() || '0.0.0.0',
    port: integerInRange(env.PORT, 3000, 1, 65_535, 'PORT'),
    rpcUrl,
    rpcTimeoutMs: integerInRange(env.RPC_TIMEOUT_MS, 10_000, 250, 60_000, 'RPC_TIMEOUT_MS'),
    trustedDemoTokenAddress: optionalAddress(env.TRUSTED_DEMO_TOKEN_ADDRESS, 'TRUSTED_DEMO_TOKEN_ADDRESS'),
    demoEventOnlyAddress: optionalAddress(env.DEMO_EVENT_ONLY_ADDRESS, 'DEMO_EVENT_ONLY_ADDRESS'),
    corsOrigins: commaSeparated(env.CORS_ORIGINS, ['http://localhost:5173']),
  }
}

function requiredUrl(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new Error(`${name} is required.`)

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} must be a valid HTTP(S) URL.`)
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} must use HTTP or HTTPS.`)
  }

  return url.toString()
}

function optionalAddress(value: string | undefined, name: string): HexAddress | undefined {
  if (!value?.trim()) return undefined
  if (!ADDRESS_PATTERN.test(value)) throw new Error(`${name} must be a 20-byte hex address.`)
  return value.toLowerCase() as HexAddress
}

function integerInRange(
  raw: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
  name: string,
): number {
  if (!raw?.trim()) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`)
  }
  return value
}

function commaSeparated(raw: string | undefined, fallback: string[]): string[] {
  if (!raw?.trim()) return fallback
  return raw.split(',').map((value) => value.trim()).filter(Boolean)
}
