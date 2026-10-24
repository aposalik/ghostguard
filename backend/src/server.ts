import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { buildApp } from './api/app.js'
import { FindingEventBroker } from './api/finding-events.js'
import { TransactionAnalyzer } from './analyzer/transaction-analyzer.js'
import {
  createViemTransactionSender,
  disabledProducerStatus,
  TransactionProducer,
} from './agents/transaction-producer.js'
import { loadConfig } from './config/env.js'
import { ResendEmailNotifier } from './notifications/email.js'
import { JsonRpcClient } from './watcher/rpc.js'
import { SqliteFindingStore } from './watcher/store.js'
import { disabledDetectorStatus, TransferWatcher } from './watcher/transfer-watcher.js'

async function start(): Promise<void> {
  const config = loadConfig()
  const rpc = new JsonRpcClient(config.rpcUrl, config.rpcTimeoutMs)
  const service = new TransactionAnalyzer(rpc, {
    trustedDemoTokenAddress: config.trustedDemoTokenAddress,
    demoEventOnlyAddress: config.demoEventOnlyAddress,
  })
  const store = config.watcher.enabled ? new SqliteFindingStore(config.watcher.databaseUrl) : undefined
  const findingEvents = new FindingEventBroker()
  const frontendDirectory = fileURLToPath(new URL('../../frontend/dist', import.meta.url))
  let watcher: TransferWatcher | undefined
  let producer: TransactionProducer | undefined
  const app = await buildApp({
    service,
    findings: store,
    monitoring: store,
    events: findingEvents,
    ...(existsSync(frontendDirectory) ? { frontendDirectory } : {}),
    corsOrigins: config.corsOrigins,
    logger: true,
    agentStatus: () => ({
      producer: producer?.getStatus() ?? disabledProducerStatus(),
      detector: watcher?.getStatus() ?? disabledDetectorStatus(),
    }),
  })
  const notifier = config.email.enabled
    ? new ResendEmailNotifier({
        apiUrl: config.email.apiUrl,
        apiKey: config.email.apiKey!,
        from: config.email.from!,
        to: config.email.to!,
        explorerUrl: config.email.explorerUrl,
      })
    : undefined
  watcher = store
    ? new TransferWatcher(rpc, service, store, notifier, {
        monitoredWallets: config.watcher.monitoredWallets,
        startBlock: config.watcher.startBlock,
        confirmations: config.watcher.confirmations,
        blockRange: config.watcher.blockRange,
        pollIntervalMs: config.watcher.pollIntervalMs,
        onError: (error) => app.log.error({ error }, 'Watcher cycle failed'),
        onFinding: (finding) => {
          findingEvents.publish(finding)
          app.log.info({ finding }, 'Watcher stored a monitored transfer finding')
        },
        onActivity: (activity) => {
          findingEvents.publishActivity(activity)
          app.log.info({ activityId: activity.id }, 'Watcher stored monitored account activity')
        },
        onAlert: (finding) => app.log.info({ findingId: finding.id }, 'Watcher delivered an email alert'),
      })
    : undefined
  producer = config.producer.enabled
    ? new TransactionProducer(createViemTransactionSender({
        rpcUrl: config.rpcUrl,
        privateKey: config.producer.privateKey!,
        recipientAddress: config.producer.recipientAddress!,
        demoTokenAddress: config.trustedDemoTokenAddress!,
        demoEventOnlyAddress: config.demoEventOnlyAddress!,
        amount: config.producer.amount,
      }), {
        ratePerSecond: config.producer.ratePerSecond,
        maxTransactions: config.producer.maxTransactions,
        suspiciousEvery: config.producer.suspiciousEvery,
        onSubmitted: (kind, transactionHash) => {
          app.log.info({ kind, transactionHash }, 'Producer submitted a Monad transaction')
        },
        onError: () => app.log.error('Producer transaction submission failed'),
      })
    : undefined

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Shutting down GhostGuard backend')
    await producer?.stop()
    await watcher?.stop()
    store?.close()
    await app.close()
  }

  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))

  await app.listen({ host: config.host, port: config.port })
  watcher?.start()
  producer?.start()
}

start().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'GhostGuard backend failed to start.')
  process.exitCode = 1
})
