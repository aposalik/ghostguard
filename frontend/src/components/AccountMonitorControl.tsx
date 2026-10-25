import { useState, type FormEvent } from 'react'
import type { HexAddress, MonitoredAccount } from '@ghostguard/shared'
import type { AccountMonitorState } from '../hooks/useAccountMonitor'
import type { StreamStatus } from '../hooks/useLiveEvents'
import { isAccountAddress } from '../services/api'

interface AccountMonitorControlProps {
  account: MonitoredAccount | null
  state: AccountMonitorState
  streamStatus: StreamStatus
  error: string | null
  onEnable: (address: HexAddress) => Promise<void>
  onDisable: () => Promise<void>
}

export function AccountMonitorControl({
  account,
  state,
  streamStatus,
  error,
  onEnable,
  onDisable,
}: AccountMonitorControlProps) {
  const [value, setValue] = useState(account?.address ?? '')
  const [validationError, setValidationError] = useState<string | null>(null)
  const isLoading = state === 'loading'
  const isActive = Boolean(account?.enabled)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = value.trim().toLowerCase()
    if (!isAccountAddress(normalized)) {
      setValidationError('Enter a complete 0x account address with 40 hexadecimal characters.')
      return
    }
    setValidationError(null)
    await onEnable(normalized)
  }

  return (
    <div className={`account-monitor-control ${isActive ? 'is-active' : ''}`}>
      <form className="account-monitor-form" onSubmit={submit}>
        <label htmlFor="monitored-account">Account to monitor</label>
        <div className="account-monitor-entry">
          <span className="account-prompt" aria-hidden="true">0x</span>
          <input
            id="monitored-account"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="0x72a3…b9bd"
            autoComplete="off"
            spellCheck={false}
            disabled={isActive || isLoading}
            aria-invalid={Boolean(validationError)}
          />
          {isActive ? (
            <button
              type="button"
              className="agent-mode-button is-on"
              onClick={() => void onDisable()}
              disabled={isLoading}
              aria-pressed="true"
            >
              <span className="agent-toggle-track"><i /></span>
              Agent on
            </button>
          ) : (
            <button type="submit" className="agent-mode-button" disabled={isLoading} aria-pressed="false">
              <span className="agent-toggle-track"><i /></span>
              {isLoading ? 'Starting…' : 'Start agent'}
            </button>
          )}
        </div>
      </form>

      <div className="account-monitor-meta">
        <span className={`monitor-state monitor-state-${isActive ? streamStatus : state}`}>
          <i aria-hidden="true" />
          {isActive ? streamLabel(streamStatus) : stateLabel(state)}
        </span>
        <span>Read-only · history remains stored when paused</span>
      </div>

      {(validationError || error) && (
        <p className="account-monitor-error" role="alert">{validationError ?? error}</p>
      )}
    </div>
  )
}

function streamLabel(status: StreamStatus): string {
  switch (status) {
    case 'connected': return 'Agent listening live'
    case 'polling': return 'Agent polling history'
    case 'connecting': return 'Agent connecting'
    default: return 'Agent reconnecting'
  }
}

function stateLabel(state: AccountMonitorState): string {
  switch (state) {
    case 'loading': return 'Updating Agent Mode'
    case 'paused': return 'Agent paused'
    case 'error': return 'Agent needs attention'
    default: return 'Agent ready'
  }
}
