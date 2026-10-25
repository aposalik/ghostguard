import type { AccountActivity, AnalyzeTransactionResponse } from '@ghostguard/shared'
import { AccountActivityList } from '../components/AccountActivityList'
import { AccountMonitorControl } from '../components/AccountMonitorControl'
import { AnalysisPanel } from '../components/AnalysisPanel'
import { AppHeader } from '../components/AppHeader'
import { ArchitecturePanel } from '../components/ArchitecturePanel'
import { BackendStatusBanner } from '../components/BackendStatusBanner'
import { EvidenceGraphPanel } from '../components/EvidenceGraphPanel'
import { SiteFooter } from '../components/SiteFooter'
import { useAccountMonitor } from '../hooks/useAccountMonitor'
import { useTransactionAnalysis } from '../hooks/useTransactionAnalysis'

export function TryItPage() {
  const monitor = useAccountMonitor()
  const backend = useTransactionAnalysis()
  const findingResponse = toFindingResponse(monitor.selectedActivity)

  return (
    <div className="portfolio-shell try-page account-monitor-page">
      <AppHeader currentPage="try-it" />

      <BackendStatusBanner
        isBackendOnline={backend.isBackendOnline}
        onCheckBackend={backend.probeHealth}
      />

      <main>
        <section className="try-hero" aria-labelledby="try-title">
          <div className="try-grid-pattern" />
          <div className="portfolio-width try-hero-layout">
            <div className="try-heading">
              <p className="portfolio-kicker">Persistent account intelligence · Monad Testnet 10143</p>
              <h1 id="try-title">
                <span className="try-script">Trace</span>
                <span>THE REAL</span>
                <span>EMITTER.</span>
              </h1>
            </div>
            <div className="try-hero-copy">
              <p>
                Enter an account and switch Agent Mode on. GhostGuard follows finalized incoming and outgoing
                activity, verifies Transfer claims, saves every observation, and draws the evidence as it arrives.
              </p>
              <div className="try-safety-note">
                <span aria-hidden="true">✦</span>
                <span>Read-only monitoring. No wallet connection. No transaction signing.</span>
              </div>
            </div>
          </div>

          <div className="portfolio-width try-search-stage account-monitor-stage">
            <AccountMonitorControl
              key={monitor.account?.address ?? 'new-monitor'}
              account={monitor.account}
              state={monitor.state}
              streamStatus={monitor.streamStatus}
              error={monitor.error}
              onEnable={monitor.enable}
              onDisable={monitor.disable}
            />
            <div className="hero-proof" aria-label="Account monitor guarantees">
              <span className="proof-tag">Database persisted</span>
              <span className="proof-tag">Realtime account graph</span>
              <span className="proof-tag">Red requires evidence</span>
            </div>
          </div>
        </section>

        <section className="try-workbench account-workbench" aria-label="GhostGuard account monitoring workbench">
          <div className="portfolio-width try-workbench-heading">
            <div>
              <p className="section-index dark-index">LIVE / ACCOUNT WORKBENCH</p>
              <h2>FOLLOW THE<br />MONEY.</h2>
            </div>
            <div className="workbench-legend">
              <span><i className="legend-dot is-live" /> Incoming · green</span>
              <span><i className="legend-dot is-deterministic" /> Outgoing · yellow</span>
              <span><i className="legend-dot is-danger" /> Suspicious · red</span>
            </div>
          </div>

          <div className="portfolio-width dashboard account-dashboard">
            <div className="account-dashboard-grid">
              <EvidenceGraphPanel
                address={monitor.account?.address ?? null}
                activities={monitor.activities}
                selectedActivityId={monitor.selectedActivityId}
                agentEnabled={Boolean(monitor.account?.enabled)}
                streamStatus={monitor.streamStatus}
                onSelectActivity={monitor.selectActivity}
              />
              <aside className="sidebar-stack account-sidebar">
                <AccountActivityList
                  activities={monitor.activities}
                  selectedActivityId={monitor.selectedActivityId}
                  onSelectActivity={monitor.selectActivity}
                  onRefresh={monitor.refresh}
                />
                <ArchitecturePanel />
              </aside>
            </div>

            {findingResponse && (
              <div className="account-finding-detail">
                <p className="section-index dark-index">SELECTED TRANSFER CLAIM / RECEIPT PROOF</p>
                <AnalysisPanel
                  state="success"
                  data={findingResponse}
                  error={null}
                />
              </div>
            )}
          </div>
        </section>

        <section className="try-explainer">
          <div className="portfolio-width try-explainer-grid">
            <div>
              <p className="section-index light-index">HOW TO READ THE GRAPH</p>
              <h2>DIRECTION<br />IS NOT<br />TRUST.</h2>
            </div>
            <div className="verdict-card verdict-verified">
              <span>01</span>
              <strong>Green comes in</strong>
              <p>Finalized incoming account or trusted-token activity points toward the watched account.</p>
            </div>
            <div className="verdict-card verdict-review">
              <span>02</span>
              <strong>Yellow goes out</strong>
              <p>Finalized outgoing calls and transfers point from the watched account to the counterparty.</p>
            </div>
            <div className="verdict-card verdict-suspicious">
              <span>03</span>
              <strong>Red means evidence</strong>
              <p>A red edge requires a known deceptive emitter or another deterministic verification failure.</p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

function toFindingResponse(activity: AccountActivity | null): AnalyzeTransactionResponse | null {
  if (!activity?.finding) return null
  return {
    transaction: {
      chainId: activity.chainId,
      transactionHash: activity.transactionHash,
      receiptStatus: 'SUCCESS',
      blockNumber: activity.blockNumber,
    },
    findings: [activity.finding],
  }
}
