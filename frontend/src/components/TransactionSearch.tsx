import { useState, type FormEvent } from 'react'
import type { TransactionHash } from '@ghostguard/shared'
import { isTransactionHash } from '../services/api'

interface TransactionSearchProps {
  isLoading: boolean
  onSubmit: (hash: TransactionHash) => void
}

export function TransactionSearch({ isLoading, onSubmit }: TransactionSearchProps) {
  const [value, setValue] = useState('')
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
    <div>
      <form className="search-shell" onSubmit={handleSubmit} noValidate>
        <label className="sr-only" htmlFor="transaction-hash">Monad transaction hash</label>
        <input
          id="transaction-hash"
          className="search-field"
          name="transactionHash"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            if (validationError) setValidationError(null)
          }}
          placeholder="0x — paste a Monad transaction hash"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(validationError)}
          aria-describedby={validationError ? 'hash-error' : undefined}
        />
        <button className="search-button" type="submit" disabled={isLoading}>
          <span className="button-content">
            {isLoading ? 'Inspecting…' : 'Inspect transaction'}
            {!isLoading && <span className="button-arrow" aria-hidden="true">→</span>}
          </span>
        </button>
      </form>
      {validationError && <p className="field-error" id="hash-error" role="alert">{validationError}</p>}
    </div>
  )
}
