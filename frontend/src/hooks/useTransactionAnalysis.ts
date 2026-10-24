import { useCallback, useEffect, useState } from 'react'
import type { AnalyzeTransactionResponse, SecurityFinding, TransactionHash } from '@ghostguard/shared'
import { getDemoPreset, INITIAL_MONITOR_FINDINGS } from '../data/demoScenarios'
import { analyzeTransaction, ApiRequestError, checkBackendHealth } from '../services/api'

type AnalysisState = 'idle' | 'loading' | 'success' | 'error'

export interface AnalysisErrorInfo {
  message: string
  code: string
  status: number
  diagnostic?: string
}

export function useTransactionAnalysis() {
  const [state, setState] = useState<AnalysisState>('idle')
  const [data, setData] = useState<AnalyzeTransactionResponse | null>(null)
  const [errorInfo, setErrorInfo] = useState<AnalysisErrorInfo | null>(null)
  const [currentHash, setCurrentHash] = useState<TransactionHash | null>(null)
  const [history, setHistory] = useState<SecurityFinding[]>(INITIAL_MONITOR_FINDINGS)
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null)
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null)
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(false)

  // Probe backend health safely on mount
  useEffect(() => {
    let cancelled = false

    async function probe() {
      try {
        await checkBackendHealth()
        if (!cancelled) {
          setIsBackendOnline(true)
        }
      } catch {
        if (!cancelled) {
          setIsBackendOnline(false)
        }
      }
    }

    void probe()

    return () => {
      cancelled = true
    }
  }, [])

  const probeHealth = useCallback(async () => {
    try {
      await checkBackendHealth()
      setIsBackendOnline(true)
      return true
    } catch {
      setIsBackendOnline(false)
      return false
    }
  }, [])

  const analyze = useCallback(
    async (transactionHash: TransactionHash) => {
      setState('loading')
      setData(null)
      setErrorInfo(null)
      setCurrentHash(transactionHash)

      try {
        const response = await analyzeTransaction(
          { transactionHash },
          { forceSimulation: isSimulationActive },
        )
        setData(response)
        setState('success')

        // If this was fulfilled by an offline demo preset fixture, ensure simulation active flag is visible
        const preset = getDemoPreset(transactionHash)
        if (preset && isBackendOnline === false) {
          setIsSimulationActive(true)
        }

        if (response.findings.length > 0) {
          setSelectedFindingId(response.findings[0]?.id ?? null)
          // Prepend new findings to history without duplicates
          setHistory((prev) => {
            const newIds = new Set(response.findings.map((f) => f.id))
            const filtered = prev.filter((item) => !newIds.has(item.id))
            return [...response.findings, ...filtered]
          })
        }
      } catch (cause) {
        if (cause instanceof ApiRequestError) {
          setErrorInfo({
            message: cause.message,
            code: cause.code,
            status: cause.status,
            diagnostic: cause.diagnostic,
          })
        } else {
          setErrorInfo({
            message: 'Unexpected analysis error. No verdict was produced.',
            code: 'INTERNAL_ERROR',
            status: 500,
            diagnostic: 'An unexpected application error occurred while processing the transaction.',
          })
        }
        setState('error')
      }
    },
    [isSimulationActive, isBackendOnline],
  )

  const retry = useCallback(async () => {
    if (currentHash) {
      await analyze(currentHash)
    }
  }, [currentHash, analyze])

  const selectFinding = useCallback((finding: SecurityFinding) => {
    setSelectedFindingId(finding.id)
    setCurrentHash(finding.transactionHash)

    const response: AnalyzeTransactionResponse = {
      transaction: {
        chainId: finding.chainId,
        transactionHash: finding.transactionHash,
        receiptStatus: 'SUCCESS',
        blockNumber: finding.blockNumber,
      },
      findings: [finding],
    }
    setData(response)
    setState('success')
    setErrorInfo(null)
  }, [])

  const toggleSimulationMode = useCallback(() => {
    setIsSimulationActive((prev) => !prev)
  }, [])

  const prependFinding = useCallback((finding: SecurityFinding) => {
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.id !== finding.id)
      return [finding, ...filtered]
    })
  }, [])

  return {
    state,
    data,
    error: errorInfo?.message ?? null,
    errorInfo,
    currentHash,
    history,
    selectedFindingId,
    isBackendOnline,
    isSimulationActive,
    analyze,
    retry,
    selectFinding,
    prependFinding,
    toggleSimulationMode,
    probeHealth,
  }
}
