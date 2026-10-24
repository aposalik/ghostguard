import { useEffect, useState } from 'react'
import type { AgentStatusResponse, AgentState } from '@ghostguard/shared'
import { fetchAgentStatus } from '../services/api'

const POLL_INTERVAL_MS = 5_000

export function AgentStatusPanel() {
  const [status, setStatus] = useState<AgentStatusResponse | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function refresh() {
      try {
        const next = await fetchAgentStatus()
        if (!cancelled) {
          setStatus(next)
          setUnavailable(false)
        }
      } catch {
        if (!cancelled) setUnavailable(true)
      }
    }

    void refresh()
    const timer = setInterval(refresh, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  return (
    <section className="panel agent-status-panel" aria-labelledby="agent-status-title">
      <div className="panel-heading">
        <div className="panel-heading-left">
          <span className="live-pulse-dot" aria-hidden="true" />
          <h2 id="agent-status-title">Automation Agents</h2>
        </div>
        <span className={`agent-api-state ${unavailable ? 'is-error' : ''}`}>
          {unavailable ? 'Status unavailable' : 'Live status'}
        </span>
      </div>

      <div className="agent-status-grid">
        <article className="agent-card">
          <AgentHeading number="01" name="Transaction Producer" state={status?.producer.state ?? 'starting'} />
          <p>Sends real DemoToken transfers and periodically submits an event-only transaction.</p>
          <dl>
            <div><dt>Rate</dt><dd>{status?.producer.ratePerSecond ?? 0} tx/s</dd></div>
            <div><dt>Submitted</dt><dd>{status?.producer.submitted ?? 0}</dd></div>
            <div><dt>Suspicious</dt><dd>{status?.producer.suspiciousSubmitted ?? 0}</dd></div>
            <div><dt>Budget</dt><dd>{status?.producer.maxTransactions ?? 0}</dd></div>
          </dl>
          {status?.producer.lastError && <p className="agent-error">{status.producer.lastError}</p>}
        </article>

        <article className="agent-card">
          <AgentHeading number="02" name="Detector & Notifier" state={status?.detector.state ?? 'starting'} />
          <p>Indexes monitored wallets, verifies emitters, stores findings, and sends email alerts.</p>
          <dl>
            <div><dt>Wallets</dt><dd>{status?.detector.monitoredWalletCount ?? 0}</dd></div>
            <div><dt>Events seen</dt><dd>{status?.detector.logsObserved ?? 0}</dd></div>
            <div><dt>Findings</dt><dd>{status?.detector.findingsStored ?? 0}</dd></div>
            <div>
              <dt>Email alerts</dt>
              <dd>{status?.detector.emailNotificationsEnabled ? `${status.detector.alertsDelivered} sent` : 'Off'}</dd>
            </div>
          </dl>
          {status?.detector.lastError && <p className="agent-error">{status.detector.lastError}</p>}
        </article>
      </div>
    </section>
  )
}

function AgentHeading({ number, name, state }: { number: string; name: string; state: AgentState }) {
  return (
    <div className="agent-heading">
      <span className="agent-number">{number}</span>
      <strong>{name}</strong>
      <span className={`agent-state state-${state}`}>{state.replace('_', ' ')}</span>
    </div>
  )
}
