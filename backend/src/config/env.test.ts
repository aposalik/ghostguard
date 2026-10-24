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
})
