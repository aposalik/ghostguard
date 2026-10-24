import { useEffect } from 'react'
import type { SecurityFinding } from '@ghostguard/shared'
import type { LiveNotification } from '../hooks/useLiveEvents'

interface LiveToastProps {
  notification: LiveNotification | null
  onDismiss: () => void
  onInspect: (finding: SecurityFinding) => void
}

export function LiveToast({ notification, onDismiss, onInspect }: LiveToastProps) {
  useEffect(() => {
    if (!notification) return

    // Auto-dismiss toast after 7 seconds
    const timer = setTimeout(() => {
      onDismiss()
    }, 7000)

    return () => clearTimeout(timer)
  }, [notification, onDismiss])

  if (!notification) return null

  const { finding, title, message, tone } = notification

  return (
    <div className={`live-toast-container toast-tone-${tone}`} role="alert" aria-live="assertive">
      <div className="live-toast-inner">
        <div className="toast-icon-wrap" aria-hidden="true">
          {tone === 'verified' && <span className="toast-icon">🛡️</span>}
          {tone === 'suspicious' && <span className="toast-icon">⚠️</span>}
          {tone === 'review' && <span className="toast-icon">🔍</span>}
        </div>

        <div className="toast-body">
          <div className="toast-header-row">
            <span className={`toast-badge badge-${tone}`}>
              {tone === 'verified' ? 'VERIFIED EVENT' : tone === 'suspicious' ? 'EMITTER MISMATCH' : 'NEW EVENT'}
            </span>
            <span className="toast-realtime-tag">Realtime Stream</span>
          </div>

          <h4 className="toast-title">{title}</h4>
          <p className="toast-message">{message}</p>

          <div className="toast-actions">
            <button
              type="button"
              className="toast-inspect-btn"
              onClick={() => {
                onInspect(finding)
                onDismiss()
              }}
            >
              <span>Inspect Evidence in Panel</span>
              <span className="toast-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          className="toast-close-btn"
          onClick={onDismiss}
          aria-label="Dismiss real-time notification"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
