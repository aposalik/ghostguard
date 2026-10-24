import { describe, expect, it } from 'vitest'
import { loadConfig } from './env.js'

describe('loadConfig', () => {
  it('loads safe defaults and normalizes configured addresses', () => {
    const config = loadConfig({
      MONAD_RPC_URL: 'https://rpc.example.test',
      TRUSTED_DEMO_TOKEN_ADDRESS: `0x${'AB'.repeat(20)}`,
      DEMO_EVENT_ONLY_ADDRESS: `0x${'CD'.repeat(20)}`,
    })

    expect(config).toMatchObject({
      host: '0.0.0.0',
      port: 3000,
      rpcUrl: 'https://rpc.example.test/',
      rpcTimeoutMs: 10_000,
      trustedDemoTokenAddress: `0x${'ab'.repeat(20)}`,
      demoEventOnlyAddress: `0x${'cd'.repeat(20)}`,
      corsOrigins: ['http://localhost:5173'],
    })
  })

  it('fails closed when the RPC URL is missing', () => {
    expect(() => loadConfig({})).toThrow('MONAD_RPC_URL is required.')
  })

  it('rejects non-HTTP RPC protocols and invalid addresses', () => {
    expect(() => loadConfig({ MONAD_RPC_URL: 'file:///tmp/rpc' })).toThrow('MONAD_RPC_URL must use HTTP or HTTPS.')
    expect(() => loadConfig({
      MONAD_RPC_URL: 'https://rpc.example.test',
      TRUSTED_DEMO_TOKEN_ADDRESS: '0x1234',
    })).toThrow('TRUSTED_DEMO_TOKEN_ADDRESS must be a 20-byte hex address.')
  })

  it('requires monitored wallets for an enabled watcher and email credentials for delivery', () => {
    expect(() => loadConfig({
      MONAD_RPC_URL: 'https://rpc.example.test',
      WATCH_ENABLED: 'true',
    })).toThrow('MONITORED_WALLET_ADDRESSES is required')

    expect(() => loadConfig({
      MONAD_RPC_URL: 'https://rpc.example.test',
      EMAIL_ENABLED: 'true',
    })).toThrow('EMAIL_API_KEY, ALERT_EMAIL_FROM, and ALERT_EMAIL_TO are required')
  })

  it('parses watcher ranges and normalizes monitored wallets', () => {
    const config = loadConfig({
      MONAD_RPC_URL: 'https://rpc.example.test',
      WATCH_ENABLED: 'true',
      MONITORED_WALLET_ADDRESSES: `0x${'AB'.repeat(20)},0x${'CD'.repeat(20)}`,
      WATCH_START_BLOCK: '123456',
      WATCH_CONFIRMATIONS: '7',
      WATCH_BLOCK_RANGE: '250',
    })

    expect(config.watcher).toMatchObject({
      enabled: true,
      monitoredWallets: [`0x${'ab'.repeat(20)}`, `0x${'cd'.repeat(20)}`],
      startBlock: 123456n,
      confirmations: 7n,
      blockRange: 250n,
    })
  })
})
