import type { AnalyzeTransactionResponse, Classification } from '@ghostguard/shared'
import { shortenHex } from '../utils/format'

interface AnalysisPanelProps {
  state: 'idle' | 'loading' | 'success' | 'error'
  data: AnalyzeTransactionResponse | null
  error: string | null
}

const classificationTone: Record<Classification, 'verified' | 'suspicious' | 'review'> = {
  VERIFIED_DEMO_TRANSFER: 'verified',
  SUSPICIOUS_EVENT: 'suspicious',
  NEEDS_REVIEW: 'review',
  FAILED_TRANSACTION: 'suspicious',
  PENDING: 'review',
}

export function AnalysisPanel({ state, data, error }: AnalysisPanelProps) {
  return (
    <section className="panel" aria-labelledby="analysis-title">
      <div className="panel-heading">
        <h2 id="analysis-title">Evidence inspector</h2>
        <span className="panel-tag">Deterministic analysis</span>
      </div>

      <div className="analysis-body" aria-live="polite">
        {(state === 'idle' || state === 'loading') && (
          <div className="empty-state">
            <div className="empty-state-content">
              <div className="radar" aria-hidden="true" />
              <p className="empty-kicker">{state === 'loading' ? 'Querying chain evidence' : 'Ready to inspect'}</p>
              <h3>{state === 'loading' ? 'Following the receipt and logs' : 'Verify the emitter, not just the event'}</h3>
              <p>
                {state === 'loading'
                  ? 'GhostGuard is asking the backend for the transaction receipt and every matching log.'
                  : 'Paste a transaction hash above. GhostGuard will never generate a finding without backend evidence.'}
              </p>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="error-state" role="alert">
            <p className="empty-kicker">Analysis unavailable</p>
            <h3>No security verdict was produced</h3>
            <p>{error ?? 'The backend could not complete the request. Check the service and try again.'}</p>
          </div>
        )}

        {state === 'success' && data && (
          <div className="result-stack">
            <div className="transaction-summary">
              <div className="summary-grid">
                <Datum label="Receipt" value={data.transaction.receiptStatus} />
                <Datum label="Block" value={data.transaction.blockNumber ?? 'Pending'} />
                <Datum label="Chain ID" value={String(data.transaction.chainId)} />
              </div>
            </div>

            {data.findings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-content">
                  <p className="empty-kicker">No matching logs</p>
                  <h3>No transfer-shaped finding was returned</h3>
                  <p>This does not prove the transaction is safe; it only means the analyzer returned no relevant finding.</p>
                </div>
              </div>
            ) : data.findings.map((finding) => (
              <article className="finding-card" key={finding.id}>
                <span className="classification" data-tone={classificationTone[finding.classification]}>
                  {finding.classification.replaceAll('_', ' ')}
                </span>

                <div className="finding-meta">
                  <Datum label="Actual emitter" value={shortenHex(finding.actualEmitterAddress)} />
                  <Datum label="Expected token" value={finding.expectedTokenAddress ? shortenHex(finding.expectedTokenAddress) : 'Not supplied'} />
                  <Datum label="Log index" value={String(finding.logIndex)} />
                </div>

                <p className="finding-explanation">{finding.explanation}</p>

                <ul className="evidence-list" aria-label="Verification evidence">
                  {finding.checks.map((check) => (
                    <li className="evidence-item" key={check.code}>
                      <span className="evidence-name"><span aria-hidden="true">◇</span>{check.label}</span>
                      <span className="evidence-detail" title={check.detail}>{check.detail}</span>
                      <span className="evidence-outcome">{check.outcome}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function Datum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="datum-label">{label}</span>
      <span className="datum-value" title={value}>{value}</span>
    </div>
  )
}
