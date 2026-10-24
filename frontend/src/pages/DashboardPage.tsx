import { AnalysisPanel } from '../components/AnalysisPanel'
import { AppHeader } from '../components/AppHeader'
import { ArchitecturePanel } from '../components/ArchitecturePanel'
import { LiveMonitorPanel } from '../components/LiveMonitorPanel'
import { LiveToast } from '../components/LiveToast'
import { Monad3DScene } from '../components/Monad3DScene'
import { OfflineSimulationBanner } from '../components/OfflineSimulationBanner'
import { TransactionSearch } from '../components/TransactionSearch'
import { useLiveEvents } from '../hooks/useLiveEvents'
import { useTransactionAnalysis } from '../hooks/useTransactionAnalysis'

export function DashboardPage() {
  const analysis = useTransactionAnalysis()
  const liveEvents = useLiveEvents({
    onNewFinding: analysis.prependFinding,
  })

  return (
    <div className="app-shell">
      <AppHeader />

      <OfflineSimulationBanner
        isSimulationActive={analysis.isSimulationActive}
        isBackendOnline={analysis.isBackendOnline}
        onToggleSimulation={analysis.toggleSimulationMode}
        onCheckBackend={analysis.probeHealth}
      />

      <LiveToast
        notification={liveEvents.notification}
        onDismiss={liveEvents.dismissNotification}
        onInspect={analysis.selectFinding}
      />

      <main>
        <section className="hero">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                <span>On-chain transfer intelligence · Monad Testnet</span>
              </div>
              <h1>
                Events can lie.<br />
                <span className="hero-gradient-text">Evidence doesn't.</span>
              </h1>
              <p className="hero-description">
                GhostGuard reconciles Monad Testnet execution receipts, log emitters, and token contracts to expose
                spoofed ERC-20 `Transfer` events in 90 seconds.
              </p>

              <TransactionSearch
                isLoading={analysis.state === 'loading'}
                onSubmit={analysis.analyze}
                currentHash={analysis.currentHash}
              />

              <div className="hero-proof" aria-label="Product guarantees">
                <span className="proof-tag">Receipt checked</span>
                <span className="proof-tag">Emitter verified</span>
                <span className="proof-tag">Zero invented verdicts</span>
              </div>
            </div>

            <div className="hero-visual">
              <Monad3DScene />
            </div>
          </div>
        </section>

        <section className="dashboard" aria-label="GhostGuard dashboard">
          <div className="dashboard-grid">
            <AnalysisPanel
              state={analysis.state}
              data={analysis.data}
              error={analysis.error}
              errorInfo={analysis.errorInfo}
              onRetry={analysis.retry}
            />
            <aside className="sidebar-stack">
              <LiveMonitorPanel
                findings={analysis.history}
                selectedFindingId={analysis.selectedFindingId}
                streamStatus={liveEvents.status}
                onSelectFinding={analysis.selectFinding}
                onSimulateEvent={liveEvents.simulateFinding}
              />
              <ArchitecturePanel />
            </aside>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="brand-dot" />
            <span>GhostGuard · Monad Blitz Hackathon 2026</span>
          </div>
          <div className="footer-meta">
            <span className="footer-mono">Chain ID: 10143 (Monad Testnet)</span>
            <span className="footer-divider">·</span>
            <span className="footer-mono">Evidence Over Assumptions</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
