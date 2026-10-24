import { AnalysisPanel } from '../components/AnalysisPanel'
import { AgentStatusPanel } from '../components/AgentStatusPanel'
import { AppHeader } from '../components/AppHeader'
import { ArchitecturePanel } from '../components/ArchitecturePanel'
import { BackendStatusBanner } from '../components/BackendStatusBanner'
import { LiveMonitorPanel } from '../components/LiveMonitorPanel'
import { LiveToast } from '../components/LiveToast'
import { SiteFooter } from '../components/SiteFooter'
import { TransactionSearch } from '../components/TransactionSearch'
import { useLiveEvents } from '../hooks/useLiveEvents'
import { useTransactionAnalysis } from '../hooks/useTransactionAnalysis'

export function TryItPage() {
  const analysis = useTransactionAnalysis()
  const liveEvents = useLiveEvents({
    onNewFinding: analysis.prependFinding,
  })

  return (
    <div className="portfolio-shell try-page">
      <AppHeader currentPage="try-it" />

      <BackendStatusBanner
        isBackendOnline={analysis.isBackendOnline}
        onCheckBackend={analysis.probeHealth}
      />

      <LiveToast
        notification={liveEvents.notification}
        onDismiss={liveEvents.dismissNotification}
        onInspect={analysis.selectFinding}
      />

      <main>
        <section className="try-hero" aria-labelledby="try-title">
          <div className="try-grid-pattern" />
          <div className="portfolio-width try-hero-layout">
            <div className="try-heading">
              <p className="portfolio-kicker">Live evidence inspector · Monad Testnet 10143</p>
              <h1 id="try-title">
                <span className="try-script">Trace</span>
                <span>THE REAL</span>
                <span>EMITTER.</span>
              </h1>
            </div>
            <div className="try-hero-copy">
              <p>
                Paste any real Monad Testnet transaction hash. GhostGuard reads the receipt, decodes Transfer-shaped
                logs, identifies the physical emitter, and returns only the verdict the evidence supports.
              </p>
              <div className="try-safety-note">
                <span aria-hidden="true">✦</span>
                <span>Read-only inspection. No wallet connection. No transaction signing.</span>
              </div>
            </div>
          </div>

          <div className="portfolio-width try-search-stage">
            <TransactionSearch
              isLoading={analysis.state === 'loading'}
              onSubmit={analysis.analyze}
              currentHash={analysis.currentHash}
            />
            <div className="hero-proof" aria-label="Inspector guarantees">
              <span className="proof-tag">Receipt checked</span>
              <span className="proof-tag">Emitter verified</span>
              <span className="proof-tag">No invented verdicts</span>
            </div>
          </div>
        </section>

        <section className="try-workbench" aria-label="GhostGuard live analyzer">
          <div className="portfolio-width try-workbench-heading">
            <div>
              <p className="section-index dark-index">LIVE / FORENSIC WORKBENCH</p>
              <h2>FOLLOW THE<br />EVIDENCE.</h2>
            </div>
            <div className="workbench-legend">
              <span><i className="legend-dot is-live" /> Live Monad RPC</span>
              <span><i className="legend-dot is-deterministic" /> Deterministic checks</span>
              <span><i className="legend-dot is-safe" /> Read only</span>
            </div>
          </div>

          <div className="portfolio-width dashboard">
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
                />
                <AgentStatusPanel />
                <ArchitecturePanel />
              </aside>
            </div>
          </div>
        </section>

        <section className="try-explainer">
          <div className="portfolio-width try-explainer-grid">
            <div>
              <p className="section-index light-index">WHAT THE VERDICT MEANS</p>
              <h2>THREE<br />HONEST<br />OUTCOMES.</h2>
            </div>
            <div className="verdict-card verdict-verified">
              <span>01</span>
              <strong>Verified transfer</strong>
              <p>The decoded log came from the configured DemoToken contract.</p>
            </div>
            <div className="verdict-card verdict-suspicious">
              <span>02</span>
              <strong>Emitter mismatch</strong>
              <p>The Transfer shape came from the known event-only demo contract.</p>
            </div>
            <div className="verdict-card verdict-review">
              <span>03</span>
              <strong>Needs review</strong>
              <p>The evidence is incomplete or the emitter is not in the trusted demo context.</p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
