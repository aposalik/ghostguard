import type { Classification, SecurityFinding } from '@ghostguard/shared'
import { SCENARIO_A_LEGITIMATE, SCENARIO_B_SPOOFED } from '../data/demoScenarios'
import type { StreamStatus } from '../hooks/useLiveEvents'
import { formatTimeAgo, shortenHex } from '../utils/format'

interface LiveMonitorPanelProps {
  findings: SecurityFinding[]
  selectedFindingId: string | null
  streamStatus?: StreamStatus
  onSelectFinding: (finding: SecurityFinding) => void
  onSimulateEvent?: (finding: SecurityFinding) => void
}

const statusToneMap: Record<Classification, { label: string; tone: string; icon: string }> = {
  VERIFIED_DEMO_TRANSFER: { label: 'Verified', tone: 'verified', icon: '🛡️' },
  SUSPICIOUS_EVENT: { label: 'Spoofed', tone: 'suspicious', icon: '⚠️' },
  NEEDS_REVIEW: { label: 'Review', tone: 'review', icon: '🔍' },
  FAILED_TRANSACTION: { label: 'Reverted', tone: 'failed', icon: '✕' },
  PENDING: { label: 'Pending', tone: 'pending', icon: '◌' },
}

export function LiveMonitorPanel({
  findings,
  selectedFindingId,
  streamStatus = 'disconnected',
  onSelectFinding,
  onSimulateEvent,
}: LiveMonitorPanelProps) {
  function renderStreamBadge() {
    switch (streamStatus) {
      case 'connected':
        return (
          <span className="stream-badge badge-ws-connected" title="WebSocket stream connected to /api/v1/events">
            <span className="status-dot dot-green" aria-hidden="true" />
            <span>WS Realtime</span>
          </span>
        )
      case 'polling':
        return (
          <span className="stream-badge badge-http-polling" title="Fallback HTTP polling active on /api/v1/findings">
            <span className="status-dot dot-amber" aria-hidden="true" />
            <span>HTTP Polling</span>
          </span>
        )
      case 'connecting':
        return (
          <span className="stream-badge badge-connecting" title="Establishing WebSocket connection...">
            <span className="status-dot dot-cyan" aria-hidden="true" />
            <span>Connecting…</span>
          </span>
        )
      default:
        return (
          <span className="stream-badge badge-offline" title="WebSocket disconnected. Simulation mode active.">
            <span className="status-dot dot-faint" aria-hidden="true" />
            <span>Monad Feed</span>
          </span>
        )
    }
  }

  return (
    <section className="panel" aria-labelledby="monitor-title">
      <div className="panel-heading">
        <div className="panel-heading-left">
          <span className="live-pulse-dot" aria-hidden="true" />
          <h2 id="monitor-title">Live Monitor Feed</h2>
        </div>
        <div className="panel-heading-right">
          {renderStreamBadge()}
        </div>
      </div>

      <div className="monitor-body">
        <div className="status-line">
          <span className="stream-label">Realtime Findings</span>
          <span className="status-value">{findings.length} findings indexed</span>
        </div>

        {findings.length === 0 ? (
          <div className="monitor-empty">
            No events indexed yet. Inspect a transaction or run a judge demo preset above to populate the live monitor.
          </div>
        ) : (
          <div className="monitor-feed-list" role="feed" aria-label="Recent security findings">
            {findings.map((item) => {
              const info = statusToneMap[item.classification] ?? { label: 'Unknown', tone: 'review', icon: '•' }
              const isSelected = selectedFindingId === item.id

              return (
                <div
                  key={item.id}
                  className={`monitor-item-card monitor-tone-${info.tone} ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => onSelectFinding(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectFinding(item)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  title="Click to view detailed evidence in inspector"
                >
                  <div className="monitor-item-top">
                    <div className="monitor-badge-wrap">
                      <span className={`monitor-status-pill pill-${info.tone}`}>
                        <span className="pill-icon" aria-hidden="true">{info.icon}</span>
                        <span>{info.label}</span>
                      </span>
                      <span className="monitor-log-index">Log #{item.logIndex}</span>
                    </div>
                    <span className="monitor-time">{formatTimeAgo(item.analyzedAt)}</span>
                  </div>

                  <div className="monitor-item-hash">
                    <span className="mono-label">Tx:</span>
                    <span className="mono-code">{shortenHex(item.transactionHash, 7)}</span>
                  </div>

                  <div className="monitor-item-emitter">
                    <span className="mono-label">Emitter:</span>
                    <span className="mono-code-secondary">{shortenHex(item.actualEmitterAddress, 5)}</span>
                  </div>

                  {isSelected && (
                    <div className="monitor-active-indicator">
                      <span>Viewing in inspector ➔</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Real-time simulation triggers for judges */}
        {onSimulateEvent && (
          <div className="monitor-simulation-footer">
            <span className="simulation-footer-label">Demo Realtime Event Trigger:</span>
            <div className="simulation-footer-btns">
              <button
                type="button"
                className="trigger-pill trigger-legit"
                onClick={() => {
                  const sampleFinding: SecurityFinding = {
                    ...SCENARIO_A_LEGITIMATE.response.findings[0]!,
                    id: `10143:${SCENARIO_A_LEGITIMATE.transactionHash}:${Date.now()}`,
                    analyzedAt: new Date().toISOString(),
                  }
                  onSimulateEvent(sampleFinding)
                }}
                title="Simulate incoming legitimate DemoToken transfer event"
              >
                <span>+ Real Transfer</span>
              </button>
              <button
                type="button"
                className="trigger-pill trigger-spoofed"
                onClick={() => {
                  const sampleFinding: SecurityFinding = {
                    ...SCENARIO_B_SPOOFED.response.findings[0]!,
                    id: `10143:${SCENARIO_B_SPOOFED.transactionHash}:${Date.now()}`,
                    analyzedAt: new Date().toISOString(),
                  }
                  onSimulateEvent(sampleFinding)
                }}
                title="Simulate incoming spoofed decoy event"
              >
                <span>+ Spoofed Decoy</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
