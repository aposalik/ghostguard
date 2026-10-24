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
  watcher: {
    enabled: boolean
    monitoredWallets: HexAddress[]
    startBlock?: bigint
    confirmations: bigint
    blockRange: bigint
    pollIntervalMs: number
    databaseUrl: string
  }
  email: {
    enabled: boolean
    apiUrl: string
    apiKey?: string
    from?: string
    to?: string
    explorerUrl: string
  }
  producer: {
    enabled: boolean
    privateKey?: `0x${string}`
    recipientAddress?: HexAddress
    ratePerSecond: number
    maxTransactions: number
    suspiciousEvery: number
    amount: bigint
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BackendConfig {
  const rpcUrl = requiredUrl(env.MONAD_RPC_URL, 'MONAD_RPC_URL')

  const config: BackendConfig = {
    host: env.HOST?.trim() || '0.0.0.0',
    port: integerInRange(env.PORT, 3000, 1, 65_535, 'PORT'),
    rpcUrl,
    rpcTimeoutMs: integerInRange(env.RPC_TIMEOUT_MS, 10_000, 250, 60_000, 'RPC_TIMEOUT_MS'),
    trustedDemoTokenAddress: optionalAddress(env.TRUSTED_DEMO_TOKEN_ADDRESS, 'TRUSTED_DEMO_TOKEN_ADDRESS'),
    demoEventOnlyAddress: optionalAddress(env.DEMO_EVENT_ONLY_ADDRESS, 'DEMO_EVENT_ONLY_ADDRESS'),
    corsOrigins: commaSeparated(env.CORS_ORIGINS, ['http://localhost:5173']),
    watcher: {
      enabled: booleanValue(env.WATCH_ENABLED, false, 'WATCH_ENABLED'),
      monitoredWallets: commaSeparated(env.MONITORED_WALLET_ADDRESSES, [])
        .map((value) => requiredAddress(value, 'MONITORED_WALLET_ADDRESSES')),
      startBlock: optionalUnsignedBigInt(env.WATCH_START_BLOCK, 'WATCH_START_BLOCK'),
      confirmations: unsignedBigInt(env.WATCH_CONFIRMATIONS, 5n, 'WATCH_CONFIRMATIONS'),
      blockRange: positiveBigInt(env.WATCH_BLOCK_RANGE, 100n, 'WATCH_BLOCK_RANGE'),
      pollIntervalMs: integerInRange(env.WATCH_POLL_INTERVAL_MS, 3_000, 500, 300_000, 'WATCH_POLL_INTERVAL_MS'),
      databaseUrl: env.DATABASE_URL?.trim() || './data/ghostguard.db',
    },
    email: {
      enabled: booleanValue(env.EMAIL_ENABLED, false, 'EMAIL_ENABLED'),
      apiUrl: requiredUrl(env.EMAIL_API_URL ?? 'https://api.resend.com/emails', 'EMAIL_API_URL'),
      apiKey: optionalString(env.EMAIL_API_KEY),
      from: optionalString(env.ALERT_EMAIL_FROM),
      to: optionalString(env.ALERT_EMAIL_TO),
      explorerUrl: requiredUrl(env.MONAD_EXPLORER_URL ?? 'https://testnet.monadscan.com', 'MONAD_EXPLORER_URL'),
    },
    producer: {
      enabled: booleanValue(env.PRODUCER_ENABLED, false, 'PRODUCER_ENABLED'),
      privateKey: optionalPrivateKey(env.PRODUCER_PRIVATE_KEY, 'PRODUCER_PRIVATE_KEY'),
      recipientAddress: optionalAddress(env.PRODUCER_RECIPIENT_ADDRESS, 'PRODUCER_RECIPIENT_ADDRESS'),
      ratePerSecond: integerInRange(env.PRODUCER_TPS, 1, 1, 10, 'PRODUCER_TPS'),
      maxTransactions: integerInRange(env.PRODUCER_MAX_TRANSACTIONS, 100, 1, 10_000, 'PRODUCER_MAX_TRANSACTIONS'),
      suspiciousEvery: integerInRange(env.PRODUCER_SUSPICIOUS_EVERY, 10, 2, 1_000, 'PRODUCER_SUSPICIOUS_EVERY'),
      amount: positiveBigInt(env.PRODUCER_AMOUNT_BASE_UNITS, 1n, 'PRODUCER_AMOUNT_BASE_UNITS'),
    },
  }

  if (config.watcher.enabled && config.watcher.monitoredWallets.length === 0) {
    throw new Error('MONITORED_WALLET_ADDRESSES is required when WATCH_ENABLED=true.')
  }
  if (config.email.enabled && (!config.email.apiKey || !config.email.from || !config.email.to)) {
    throw new Error('EMAIL_API_KEY, ALERT_EMAIL_FROM, and ALERT_EMAIL_TO are required when EMAIL_ENABLED=true.')
  }
  if (config.email.enabled && !config.watcher.enabled) {
    throw new Error('WATCH_ENABLED must be true when EMAIL_ENABLED=true.')
  }
  if (config.producer.enabled) {
    if (!config.producer.privateKey || !config.producer.recipientAddress) {
      throw new Error('PRODUCER_PRIVATE_KEY and PRODUCER_RECIPIENT_ADDRESS are required when PRODUCER_ENABLED=true.')
    }
    if (!config.trustedDemoTokenAddress || !config.demoEventOnlyAddress) {
      throw new Error('TRUSTED_DEMO_TOKEN_ADDRESS and DEMO_EVENT_ONLY_ADDRESS are required when PRODUCER_ENABLED=true.')
    }
    if (!config.watcher.enabled) {
      throw new Error('WATCH_ENABLED must be true when PRODUCER_ENABLED=true.')
    }
    if (!config.watcher.monitoredWallets.includes(config.producer.recipientAddress)) {
      throw new Error('PRODUCER_RECIPIENT_ADDRESS must be included in MONITORED_WALLET_ADDRESSES.')
    }
  }

  return config
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

function requiredAddress(value: string, name: string): HexAddress {
  if (!ADDRESS_PATTERN.test(value)) throw new Error(`${name} must contain only 20-byte hex addresses.`)
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

function booleanValue(raw: string | undefined, fallback: boolean, name: string): boolean {
  if (!raw?.trim()) return fallback
  if (raw === 'true') return true
  if (raw === 'false') return false
  throw new Error(`${name} must be true or false.`)
}

function optionalString(raw: string | undefined): string | undefined {
  return raw?.trim() || undefined
}

function optionalPrivateKey(value: string | undefined, name: string): `0x${string}` | undefined {
  if (!value?.trim()) return undefined
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) throw new Error(`${name} must be a 32-byte hex private key.`)
  return value as `0x${string}`
}

function optionalUnsignedBigInt(raw: string | undefined, name: string): bigint | undefined {
  if (!raw?.trim()) return undefined
  return parseBigInt(raw, name, true)
}

function unsignedBigInt(raw: string | undefined, fallback: bigint, name: string): bigint {
  if (!raw?.trim()) return fallback
  return parseBigInt(raw, name, true)
}

function positiveBigInt(raw: string | undefined, fallback: bigint, name: string): bigint {
  if (!raw?.trim()) return fallback
  return parseBigInt(raw, name, false)
}

function parseBigInt(raw: string, name: string, allowZero: boolean): bigint {
  if (!/^[0-9]+$/.test(raw)) throw new Error(`${name} must be an unsigned decimal integer.`)
  const value = BigInt(raw)
  if (!allowZero && value === 0n) throw new Error(`${name} must be greater than zero.`)
  return value
}
