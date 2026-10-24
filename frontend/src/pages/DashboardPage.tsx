import { AnalysisPanel } from '../components/AnalysisPanel'
import { AppHeader } from '../components/AppHeader'
import { ArchitecturePanel } from '../components/ArchitecturePanel'
import { LiveMonitorPanel } from '../components/LiveMonitorPanel'
import { TransactionSearch } from '../components/TransactionSearch'
import { useTransactionAnalysis } from '../hooks/useTransactionAnalysis'

export function DashboardPage() {
  const analysis = useTransactionAnalysis()

  return (
    <div className="app-shell">
      <AppHeader />

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">On-chain transfer intelligence</p>
            <h1>Events can lie.<br /><span>Evidence doesn't.</span></h1>
            <p className="hero-description">
              Inspect a Monad transaction to see who actually emitted the transfer event—and whether the claimed token movement can be verified.
            </p>

            <TransactionSearch isLoading={analysis.state === 'loading'} onSubmit={analysis.analyze} />

            <div className="hero-proof" aria-label="Product guarantees">
              <span>Receipt checked</span>
              <span>Emitter verified</span>
              <span>No invented verdicts</span>
            </div>
          </div>
        </section>

        <section className="dashboard" aria-label="GhostGuard dashboard">
          <div className="dashboard-grid">
            <AnalysisPanel state={analysis.state} data={analysis.data} error={analysis.error} />
            <aside className="sidebar-stack">
              <ArchitecturePanel />
              <LiveMonitorPanel />
            </aside>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <span>GhostGuard · Built for Monad Blitz Ankara</span>
          <span className="footer-mono">Evidence over assumptions · 2026</span>
        </div>
      </footer>
    </div>
  )
}
