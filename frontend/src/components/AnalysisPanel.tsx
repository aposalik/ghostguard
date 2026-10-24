import type { AnalyzeTransactionResponse, Classification } from '@ghostguard/shared'
import type { AnalysisErrorInfo } from '../hooks/useTransactionAnalysis'
import {
  formatTimeAgo,
  formatTokenAmount,
  getExplorerAddressUrl,
  getExplorerTxUrl,
  shortenHex,
} from '../utils/format'
import { CopyButton } from './CopyButton'

interface AnalysisPanelProps {
  state: 'idle' | 'loading' | 'success' | 'error'
  data: AnalyzeTransactionResponse | null
  error: string | null
  errorInfo?: AnalysisErrorInfo | null
  onRetry?: () => void
}

export function AnalysisPanel({ state, data, error, errorInfo, onRetry }: AnalysisPanelProps) {
  return (
    <section className="panel" aria-labelledby="analysis-title">
      <div className="panel-heading">
        <div className="panel-heading-left">
          <span className="panel-status-orb" />
          <h2 id="analysis-title">Evidence Inspector</h2>
        </div>
        <div className="panel-heading-right">
          <span className="panel-tag">Monad Testnet · Deterministic</span>
        </div>
      </div>

      <div className="analysis-body" aria-live="polite">
        {(state === 'idle' || state === 'loading') && (
          <div className="empty-state">
            <div className="empty-state-content">
              <div className={`radar ${state === 'loading' ? 'is-loading' : ''}`} aria-hidden="true" />
              <p className="empty-kicker">
                {state === 'loading' ? 'Querying Monad Testnet Evidence…' : 'Ready for Inspection'}
              </p>
              <h3>
                {state === 'loading'
                  ? 'Reconciling receipt, emitter address & logs'
                  : 'Verify the log emitter, not just the event'}
              </h3>
              <p>
                {state === 'loading'
                  ? 'GhostGuard is parsing the Monad transaction receipt, extracting log topics, and verifying against verified token contracts.'
                  : 'Paste a real Monad Testnet transaction hash above to inspect its receipt, emitter, and transfer evidence.'}
              </p>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="error-state" role="alert">
            <div className="error-icon" aria-hidden="true">⚠️</div>
            <div className="error-meta-badge">
              <span className="error-code-tag">{errorInfo?.code ?? 'ERROR'}</span>
              {errorInfo?.status !== undefined && errorInfo.status > 0 && (
                <span className="error-status-tag">HTTP {errorInfo.status}</span>
              )}
            </div>
            <p className="empty-kicker text-red">Analysis Unavailable</p>
            <h3>No security verdict could be verified</h3>
            <p className="error-message-text">
              {errorInfo?.message ?? error ?? 'The backend could not complete the request. Check your connection or verify the hash on Monad Explorer.'}
            </p>
            {errorInfo?.diagnostic && errorInfo.diagnostic !== errorInfo.message && (
              <p className="error-diagnostic-text">{errorInfo.diagnostic}</p>
            )}

            {onRetry && (
              <div className="error-actions">
                <button type="button" className="retry-button" onClick={onRetry}>
                  <span className="retry-icon" aria-hidden="true">↺</span>
                  <span>Try Again</span>
                </button>
              </div>
            )}
          </div>
        )}

        {state === 'success' && data && (
          <div className="result-stack">
            {/* Transaction Overview Card */}
            <div className="transaction-summary-card">
              <div className="summary-header">
                <span className="summary-title">Transaction Receipt Overview</span>
                <a
                  href={getExplorerTxUrl(data.transaction.transactionHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                  title="View transaction on Monad Explorer"
                >
                  <span>Monad Explorer</span>
                  <span className="external-arrow" aria-hidden="true">↗</span>
                </a>
              </div>
              <div className="summary-grid">
                <Datum
                  label="Transaction Hash"
                  value={shortenHex(data.transaction.transactionHash, 8)}
                  fullValue={data.transaction.transactionHash}
                  link={getExplorerTxUrl(data.transaction.transactionHash)}
                  copyValue={data.transaction.transactionHash}
                />
                <Datum
                  label="Receipt Status"
                  value={data.transaction.receiptStatus}
                  badgeTone={data.transaction.receiptStatus === 'SUCCESS' ? 'verified' : 'failed'}
                />
                <Datum label="Block Number" value={data.transaction.blockNumber ?? 'Pending'} />
                <Datum label="Monad Chain ID" value={String(data.transaction.chainId)} />
              </div>
            </div>

            {/* Findings List */}
            {data.findings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-content">
                  <p className="empty-kicker">No Transfer Logs Detected</p>
                  <h3>No transfer-shaped finding was returned</h3>
                  <p>
                    This transaction does not emit ERC-20 `Transfer` signatures. This does not indicate safety; it
                    only means no transfer event was recorded in this transaction.
                  </p>
                </div>
              </div>
            ) : (
              data.findings.map((finding) => (
                <article className="finding-card" key={finding.id}>
                  {/* Classification Badge Header */}
                  <div className="finding-header">
                    <ClassificationBadge classification={finding.classification} />
                    <span className="analyzed-timestamp">
                      Analyzed {formatTimeAgo(finding.analyzedAt)}
                    </span>
                  </div>

                  {/* Prominent Emitter Mismatch Callout Box */}
                  {finding.classification === 'SUSPICIOUS_EVENT' && (
                    <div className="emitter-mismatch-banner" role="alert">
                      <div className="mismatch-header">
                        <span className="mismatch-alert-icon" aria-hidden="true">⚠️</span>
                        <h4>CRITICAL: EMITTER MISMATCH DETECTED</h4>
                      </div>
                      <p className="mismatch-description">
                        Log was emitted by contract{' '}
                        <a
                          href={getExplorerAddressUrl(finding.actualEmitterAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mono-code-link"
                        >
                          {shortenHex(finding.actualEmitterAddress, 6)}
                        </a>
                        , <strong>NOT</strong> the trusted DemoToken contract{' '}
                        {finding.expectedTokenAddress ? (
                          <a
                            href={getExplorerAddressUrl(finding.expectedTokenAddress)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mono-code-link"
                          >
                            {shortenHex(finding.expectedTokenAddress, 6)}
                          </a>
                        ) : (
                          '0x...'
                        )}
                        . <strong>This log cannot prove a trusted-token balance change.</strong>
                      </p>
                      <div className="mismatch-breakdown">
                        <div className="mismatch-side actual-decoy">
                          <div className="side-title-row">
                            <span className="side-title">Actual Log Emitter (Decoy)</span>
                            <CopyButton text={finding.actualEmitterAddress} label="Copy decoy emitter address" />
                          </div>
                          <span className="side-address">{finding.actualEmitterAddress}</span>
                          <span className="side-verdict">⚠️ Configured event-only demo emitter</span>
                        </div>
                        <div className="mismatch-side expected-token">
                          <div className="side-title-row">
                            <span className="side-title">Trusted Token Contract</span>
                            {finding.expectedTokenAddress && (
                              <CopyButton text={finding.expectedTokenAddress} label="Copy trusted token address" />
                            )}
                          </div>
                          <span className="side-address">{finding.expectedTokenAddress ?? 'Not specified'}</span>
                          <span className="side-verdict">◌ Balance-delta evidence remains explicitly UNKNOWN</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Finding Metadata Grid */}
                  <div className="finding-meta-grid">
                    <Datum
                      label="Actual Emitter Address"
                      value={shortenHex(finding.actualEmitterAddress, 6)}
                      fullValue={finding.actualEmitterAddress}
                      link={getExplorerAddressUrl(finding.actualEmitterAddress)}
                      copyValue={finding.actualEmitterAddress}
                      isHighlight={finding.classification === 'SUSPICIOUS_EVENT'}
                    />
                    <Datum
                      label="Expected Token Address"
                      value={finding.expectedTokenAddress ? shortenHex(finding.expectedTokenAddress, 6) : 'Not supplied'}
                      fullValue={finding.expectedTokenAddress ?? undefined}
                      link={finding.expectedTokenAddress ? getExplorerAddressUrl(finding.expectedTokenAddress) : undefined}
                      copyValue={finding.expectedTokenAddress ?? undefined}
                    />
                    <Datum label="Log Index" value={`#${finding.logIndex}`} />
                  </div>

                  {/* Claimed Token Transfer Section */}
                  {finding.claimedTransfer && (
                    <div className="claimed-transfer-box">
                      <span className="claimed-box-title">Claimed Transfer Event Payload</span>
                      <div className="claimed-transfer-grid">
                        <div className="claimed-party">
                          <span className="claimed-label">Claimed From</span>
                          <div className="claimed-party-row">
                            <a
                              href={getExplorerAddressUrl(finding.claimedTransfer.from)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="claimed-address"
                            >
                              {shortenHex(finding.claimedTransfer.from, 6)} ↗
                            </a>
                            <CopyButton text={finding.claimedTransfer.from} label="Copy sender address" />
                          </div>
                        </div>
                        <div className="transfer-arrow-icon" aria-hidden="true">→</div>
                        <div className="claimed-party">
                          <span className="claimed-label">Claimed To</span>
                          <div className="claimed-party-row">
                            <a
                              href={getExplorerAddressUrl(finding.claimedTransfer.to)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="claimed-address"
                            >
                              {shortenHex(finding.claimedTransfer.to, 6)} ↗
                            </a>
                            <CopyButton text={finding.claimedTransfer.to} label="Copy recipient address" />
                          </div>
                        </div>
                        <div className="claimed-amount-box">
                          <span className="claimed-label">Claimed Amount</span>
                          <span className="claimed-amount">
                            {formatTokenAmount(finding.claimedTransfer.amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Human-readable Explanation */}
                  <div className="finding-explanation-box">
                    <span className="explanation-label">Grounded Finding Verdict</span>
                    <p className="finding-explanation">{finding.explanation}</p>
                  </div>

                  {/* Evidence Checks Checklist */}
                  <div className="evidence-section">
                    <span className="evidence-section-title">Deterministic Verification Checks</span>
                    <ul className="evidence-list" aria-label="Verification evidence checklist">
                      {finding.checks.map((check) => (
                        <li className="evidence-item" key={check.code}>
                          <div className="evidence-name-group">
                            <span className={`outcome-dot outcome-${check.outcome.toLowerCase()}`} aria-hidden="true" />
                            <span className="evidence-name">{check.label}</span>
                          </div>
                          <span className="evidence-detail" title={check.detail}>
                            {check.detail}
                          </span>
                          <span className={`evidence-outcome-badge badge-${check.outcome.toLowerCase()}`}>
                            {check.outcome}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function ClassificationBadge({ classification }: { classification: Classification }) {
  switch (classification) {
    case 'VERIFIED_DEMO_TRANSFER':
      return (
        <span className="classification-badge badge-verified">
          <svg className="badge-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM13.707 8.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>VERIFIED DEMO TRANSFER</span>
        </span>
      )
    case 'SUSPICIOUS_EVENT':
      return (
        <span className="classification-badge badge-suspicious">
          <svg className="badge-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>SUSPICIOUS EVENT · SPOOFED</span>
        </span>
      )
    case 'NEEDS_REVIEW':
      return (
        <span className="classification-badge badge-review">
          <svg className="badge-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
          <span>NEEDS REVIEW · UNRECOGNIZED</span>
        </span>
      )
    case 'FAILED_TRANSACTION':
      return (
        <span className="classification-badge badge-failed">
          <svg className="badge-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>FAILED TRANSACTION</span>
        </span>
      )
    case 'PENDING':
      return (
        <span className="classification-badge badge-pending">
          <span className="pulse-indicator" aria-hidden="true" />
          <span>PENDING ON MONAD</span>
        </span>
      )
  }
}

function Datum({
  label,
  value,
  fullValue,
  link,
  copyValue,
  badgeTone,
  isHighlight,
}: {
  label: string
  value: string
  fullValue?: string
  link?: string
  copyValue?: string
  badgeTone?: 'verified' | 'failed' | 'review'
  isHighlight?: boolean
}) {
  return (
    <div className={`datum-card ${isHighlight ? 'datum-highlight' : ''}`}>
      <span className="datum-label">{label}</span>
      <div className="datum-content-row">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="datum-value-link"
            title={fullValue ?? value}
          >
            <span className="truncate-text">{value}</span>
            <span className="external-tiny-arrow" aria-hidden="true">↗</span>
          </a>
        ) : badgeTone ? (
          <span className={`datum-status-pill tone-${badgeTone}`}>{value}</span>
        ) : (
          <span className="datum-value truncate-text" title={fullValue ?? value}>
            {value}
          </span>
        )}

        {copyValue && <CopyButton text={copyValue} label={`Copy ${label}`} />}
      </div>
    </div>
  )
}
