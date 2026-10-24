import { useCallback, useState } from 'react'
import type { AnalyzeTransactionResponse, TransactionHash } from '@ghostguard/shared'
import { analyzeTransaction, ApiRequestError } from '../services/api'

type AnalysisState = 'idle' | 'loading' | 'success' | 'error'

export function useTransactionAnalysis() {
  const [state, setState] = useState<AnalysisState>('idle')
  const [data, setData] = useState<AnalyzeTransactionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const analyze = useCallback(async (transactionHash: TransactionHash) => {
    setState('loading')
    setData(null)
    setError(null)

    try {
      const response = await analyzeTransaction({ transactionHash })
      setData(response)
      setState('success')
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Unexpected analysis error. No verdict was produced.')
      setState('error')
    }
  }, [])

  return { state, data, error, analyze }
}
