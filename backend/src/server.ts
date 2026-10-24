import { buildApp } from './api/app.js'
import { TransactionAnalyzer } from './analyzer/transaction-analyzer.js'
import { loadConfig } from './config/env.js'
import { JsonRpcClient } from './watcher/rpc.js'

async function start(): Promise<void> {
  const config = loadConfig()
  const rpc = new JsonRpcClient(config.rpcUrl, config.rpcTimeoutMs)
  const service = new TransactionAnalyzer(rpc, {
    trustedDemoTokenAddress: config.trustedDemoTokenAddress,
    demoEventOnlyAddress: config.demoEventOnlyAddress,
  })
  const app = await buildApp({
    service,
    corsOrigins: config.corsOrigins,
    logger: true,
  })

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Shutting down GhostGuard backend')
    await app.close()
  }

  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))

  await app.listen({ host: config.host, port: config.port })
}

start().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'GhostGuard backend failed to start.')
  process.exitCode = 1
})
