import type { AccountActivity } from '@ghostguard/shared'
import { formatTimeAgo, shortenHex } from '../utils/format'

interface AccountActivityListProps {
  activities: AccountActivity[]
  selectedActivityId: string | null
  onSelectActivity: (activity: AccountActivity) => void
  onRefresh: () => Promise<void>
}

export function AccountActivityList({
  activities,
  selectedActivityId,
  onSelectActivity,
  onRefresh,
}: AccountActivityListProps) {
  return (
    <section className="panel account-activity-panel" aria-labelledby="activity-list-title">
      <div className="panel-heading">
        <div className="panel-heading-left">
          <span className="activity-storage-icon" aria-hidden="true">◎</span>
          <h2 id="activity-list-title">Stored Transactions</h2>
        </div>
        <button className="activity-refresh" type="button" onClick={() => void onRefresh()}>
          Refresh
        </button>
      </div>

      <div className="account-activity-summary">
        <span>Persistent evidence log</span>
        <strong>{activities.length} loaded</strong>
      </div>

      {activities.length === 0 ? (
        <div className="activity-empty">
          <strong>No account activity stored yet.</strong>
          <p>Keep Agent Mode on. New finalized activity will appear here and remain in the database.</p>
        </div>
      ) : (
        <div className="account-activity-list" role="feed" aria-label="Stored account transactions">
          {activities.map((activity) => {
            const selected = activity.id === selectedActivityId
            return (
              <button
                key={activity.id}
                type="button"
                className={`account-activity-row activity-${tone(activity)} ${selected ? 'is-selected' : ''}`}
                onClick={() => onSelectActivity(activity)}
                aria-pressed={selected}
              >
                <span className="activity-direction-glyph" aria-hidden="true">
                  {activity.direction === 'INCOMING' ? '↙' : activity.direction === 'OUTGOING' ? '↗' : '↻'}
                </span>
                <span className="activity-row-copy">
                  <strong>{rowTitle(activity)}</strong>
                  <span>{shortenHex(activity.transactionHash, 7)}</span>
                </span>
                <span className="activity-row-meta">
                  <b>#{activity.blockNumber}</b>
                  <small>{formatTimeAgo(activity.observedAt)}</small>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

function tone(activity: AccountActivity): string {
  if (activity.verdict === 'SUSPICIOUS') return 'suspicious'
  if (activity.verdict === 'NEEDS_REVIEW') return 'review'
  if (activity.verdict === 'REVERTED') return 'reverted'
  return activity.direction === 'INCOMING' ? 'incoming' : 'outgoing'
}

function rowTitle(activity: AccountActivity): string {
  if (activity.verdict === 'SUSPICIOUS') return 'Suspicious claim'
  if (activity.verdict === 'NEEDS_REVIEW') return 'Needs review'
  if (activity.verdict === 'REVERTED') return 'Reverted'
  if (activity.kind === 'TOKEN_TRANSFER') {
    return activity.direction === 'INCOMING' ? 'Token received' : 'Token sent'
  }
  if (activity.kind === 'CONTRACT_CALL') return 'Contract call'
  return activity.direction === 'INCOMING' ? 'MON received' : 'MON sent'
}
