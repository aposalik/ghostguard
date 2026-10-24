import { useState, type FormEvent } from 'react'
import type { TransactionHash } from '@ghostguard/shared'
import { SCENARIO_A_LEGITIMATE, SCENARIO_B_SPOOFED, SCENARIO_C_REVIEW } from '../data/demoScenarios'
import { isTransactionHash } from '../services/api'

interface TransactionSearchProps {
  isLoading: boolean
  onSubmit: (hash: TransactionHash) => void
  currentHash?: string | null
}

export function TransactionSearch({ isLoading, onSubmit, currentHash }: TransactionSearchProps) {
  const [value, setValue] = useState(currentHash ?? '')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [activePreset, setActivePreset] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const hash = value.trim()

    if (!isTransactionHash(hash)) {
      setValidationError('Enter a 32-byte transaction hash starting with 0x.')
      return
    }

    setValidationError(null)
    setActivePreset(null)
    onSubmit(hash)
  }

  function handleSelectPreset(scenarioId: string, hash: TransactionHash) {
    setValue(hash)
    setValidationError(null)
    setActivePreset(scenarioId)
    onSubmit(hash)
  }

  return (
    <div className="search-container">
      <form className="search-shell" onSubmit={handleSubmit} noValidate>
        <label className="sr-only" htmlFor="transaction-hash">
          Monad transaction hash
        </label>
        <div className="search-input-wrap">
          <span className="search-icon" aria-hidden="true">⬡</span>
          <input
            id="transaction-hash"
            className="search-field"
            name="transactionHash"
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              setActivePreset(null)
              if (validationError) setValidationError(null)
            }}
            placeholder="0x — paste a Monad transaction hash or choose a demo preset below"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(validationError)}
            aria-describedby={validationError ? 'hash-error' : undefined}
          />
          {value && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setValue('')
                setActivePreset(null)
                setValidationError(null)
              }}
              aria-label="Clear transaction hash"
            >
              ✕
            </button>
          )}
        </div>
        <button className="search-button" type="submit" disabled={isLoading}>
          <span className="button-content">
            {isLoading ? 'Inspecting…' : 'Inspect transaction'}
            {!isLoading && <span className="button-arrow" aria-hidden="true">→</span>}
          </span>
        </button>
      </form>

      {validationError && (
        <p className="field-error" id="hash-error" role="alert">
          {validationError}
        </p>
      )}

      {/* 90-Second Judge Demo Preset Switcher */}
      <div className="preset-bar" aria-label="Demo scenario presets">
        <div className="preset-bar-header">
          <span className="preset-title">⚡ 90-Second Judge Presets:</span>
          <span className="preset-subtitle">Instant on-chain evidence comparison</span>
        </div>
        <div className="preset-buttons">
          <button
            type="button"
            className={`preset-pill preset-pill-legit ${activePreset === 'scenario-a' ? 'is-active' : ''}`}
            onClick={() => handleSelectPreset('scenario-a', SCENARIO_A_LEGITIMATE.transactionHash)}
            disabled={isLoading}
            title={SCENARIO_A_LEGITIMATE.description}
          >
            <span className="preset-dot dot-verified" />
            <span className="preset-label">Scenario A: Legitimate Transfer</span>
            <span className="preset-tag">Verified</span>
          </button>

          <button
            type="button"
            className={`preset-pill preset-pill-spoofed ${activePreset === 'scenario-b' ? 'is-active' : ''}`}
            onClick={() => handleSelectPreset('scenario-b', SCENARIO_B_SPOOFED.transactionHash)}
            disabled={isLoading}
            title={SCENARIO_B_SPOOFED.description}
          >
            <span className="preset-dot dot-warning" />
            <span className="preset-label">Scenario B: Spoofed Decoy</span>
            <span className="preset-tag tag-hazard">Emitter Mismatch</span>
          </button>

          <button
            type="button"
            className={`preset-pill preset-pill-review ${activePreset === 'scenario-c' ? 'is-active' : ''}`}
            onClick={() => handleSelectPreset('scenario-c', SCENARIO_C_REVIEW.transactionHash)}
            disabled={isLoading}
            title={SCENARIO_C_REVIEW.description}
          >
            <span className="preset-dot dot-review" />
            <span className="preset-label">Scenario C: Unknown Contract</span>
            <span className="preset-tag tag-review">Needs Review</span>
          </button>
        </div>
      </div>
    </div>
  )
}
