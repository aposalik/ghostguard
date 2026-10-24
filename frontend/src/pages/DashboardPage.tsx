import { AnalysisPanel } from '../components/AnalysisPanel'
import { AppHeader } from '../components/AppHeader'
import { ArchitecturePanel } from '../components/ArchitecturePanel'
import { LiveMonitorPanel } from '../components/LiveMonitorPanel'
import { LiveToast } from '../components/LiveToast'
import { Monad3DScene } from '../components/Monad3DScene'
import { OfflineSimulationBanner } from '../components/OfflineSimulationBanner'
import { TransactionSearch } from '../components/TransactionSearch'
import { VulnerabilityExplainer } from '../components/VulnerabilityExplainer'
import { useLiveEvents } from '../hooks/useLiveEvents'
import { useTheme } from '../hooks/useTheme'
import { useTransactionAnalysis } from '../hooks/useTransactionAnalysis'

export function DashboardPage() {
  const { theme, toggleTheme } = useTheme()
  const analysis = useTransactionAnalysis()
  const liveEvents = useLiveEvents({
    onNewFinding: analysis.prependFinding,
  })

  return (
    <div className="app-shell">
      <AppHeader theme={theme} onToggleTheme={toggleTheme} />

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
                <span>🛡️ Monad Testnet Security · Chain ID 10143</span>
              </div>
              <h1>
                Did tokens actually move,<br />
                <span className="hero-gradient-text">or was it just a fake event?</span>
              </h1>
              <p className="hero-description">
                On EVM blockchains, any contract can emit an ERC-20 `Transfer` log without holding or transferring tokens.
                GhostGuard inspects the physical emitter contract on Monad Testnet to expose spoofed transfers in seconds.
              </p>

              <TransactionSearch
                isLoading={analysis.state === 'loading'}
                onSubmit={analysis.analyze}
                currentHash={analysis.currentHash}
              />

              <div className="hero-proof" aria-label="Security verification guarantees">
                <span className="proof-tag">✓ Physical log emitter verified</span>
                <span className="proof-tag">✓ Receipt status audited</span>
                <span className="proof-tag">✓ Zero heuristic hallucinations</span>
              </div>
            </div>

            <div className="hero-visual">
              <Monad3DScene />
            </div>
          </div>
        </section>

        {/* 30-Second Explainer for Hackathon Judges */}
        <VulnerabilityExplainer />

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
