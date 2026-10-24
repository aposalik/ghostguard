import { useState, type FormEvent } from 'react'
import type { TransactionHash } from '@ghostguard/shared'
import { isTransactionHash } from '../services/api'

interface TransactionSearchProps {
  isLoading: boolean
  onSubmit: (hash: TransactionHash) => void
  currentHash?: string | null
}

export function TransactionSearch({ isLoading, onSubmit, currentHash }: TransactionSearchProps) {
  const [value, setValue] = useState(currentHash ?? '')
  const [validationError, setValidationError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const hash = value.trim()

    if (!isTransactionHash(hash)) {
      setValidationError('Enter a 32-byte transaction hash starting with 0x.')
      return
    }

    setValidationError(null)
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
              if (validationError) setValidationError(null)
            }}
            placeholder="0x — paste a real Monad Testnet transaction hash"
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
    </div>
  )
}
