import { buildApp } from './api/app.js'
import { TransactionAnalyzer } from './analyzer/transaction-analyzer.js'
import { loadConfig } from './config/env.js'
import { ResendEmailNotifier } from './notifications/email.js'
import { JsonRpcClient } from './watcher/rpc.js'
import { SqliteFindingStore } from './watcher/store.js'
import { TransferWatcher } from './watcher/transfer-watcher.js'

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
  const store = config.watcher.enabled ? new SqliteFindingStore(config.watcher.databaseUrl) : undefined
  const notifier = config.email.enabled
    ? new ResendEmailNotifier({
        apiUrl: config.email.apiUrl,
        apiKey: config.email.apiKey!,
        from: config.email.from!,
        to: config.email.to!,
        explorerUrl: config.email.explorerUrl,
      })
    : undefined
  const watcher = store
    ? new TransferWatcher(rpc, service, store, notifier, {
        monitoredWallets: config.watcher.monitoredWallets,
        startBlock: config.watcher.startBlock,
        confirmations: config.watcher.confirmations,
        blockRange: config.watcher.blockRange,
        pollIntervalMs: config.watcher.pollIntervalMs,
        onError: (error) => app.log.error({ error }, 'Watcher cycle failed'),
        onFinding: (finding) => app.log.info({ finding }, 'Watcher stored a monitored transfer finding'),
        onAlert: (finding) => app.log.info({ findingId: finding.id }, 'Watcher delivered an email alert'),
      })
    : undefined

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Shutting down GhostGuard backend')
    await watcher?.stop()
    store?.close()
    await app.close()
  }

  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))

  await app.listen({ host: config.host, port: config.port })
  watcher?.start()
}

start().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'GhostGuard backend failed to start.')
  process.exitCode = 1
})
