import { useCallback, useEffect, useRef, useState } from 'react'
import type { AccountActivity, HexAddress, MonitoredAccount } from '@ghostguard/shared'
import {
  ApiRequestError,
  fetchAccountActivities,
  fetchMonitoredAccounts,
  getEventsWsUrl,
  setAccountMonitoring,
  type WsEventMessage,
} from '../services/api'
import type { StreamStatus } from './useLiveEvents'
import { mergeAccountActivities } from '../utils/evidence-graph'

const STORAGE_KEY = 'ghostguard.monitored-account'
const POLLING_INTERVAL_MS = 10_000
const MAX_WS_RETRIES = 5

export type AccountMonitorState = 'idle' | 'loading' | 'active' | 'paused' | 'error'

export function useAccountMonitor() {
  const [account, setAccount] = useState<MonitoredAccount | null>(null)
  const [activities, setActivities] = useState<AccountActivity[]>([])
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [state, setState] = useState<AccountMonitorState>('idle')
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const accountRef = useRef<MonitoredAccount | null>(null)

  useEffect(() => {
    accountRef.current = account
  }, [account])

  const loadActivities = useCallback(async (address: HexAddress) => {
    const page = await fetchAccountActivities(address, 100)
    setActivities(page.items)
    setSelectedActivityId((current) => (
      current && page.items.some((activity) => activity.id === current)
        ? current
        : (page.items[0]?.id ?? null)
    ))
  }, [])

  useEffect(() => {
    let cancelled = false
    const storedAddress = typeof window !== 'undefined'
      ? window.localStorage.getItem(STORAGE_KEY)?.toLowerCase()
      : null
    if (!storedAddress) return

    void fetchMonitoredAccounts()
      .then(async (accounts) => {
        const stored = accounts.find((candidate) => candidate.address.toLowerCase() === storedAddress)
        if (!stored || cancelled) return
        setAccount(stored)
        setState(stored.enabled ? 'active' : 'paused')
        await loadActivities(stored.address)
      })
      .catch(() => {
        // The explicit Agent Mode action surfaces connection failures.
      })

    return () => {
      cancelled = true
    }
  }, [loadActivities])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = null
  }, [])

  const refresh = useCallback(async () => {
    const current = accountRef.current
    if (!current) return
    try {
      await loadActivities(current.address)
    } catch {
      // Keep persisted history visible during transient polling failures.
    }
  }, [loadActivities])

  const startPolling = useCallback(() => {
    if (pollingRef.current) return
    setStreamStatus('polling')
    void refresh()
    pollingRef.current = setInterval(() => void refresh(), POLLING_INTERVAL_MS)
  }, [refresh])

  useEffect(() => {
    if (!account?.enabled || typeof window === 'undefined') return

    const monitoredAddress = account.address.toLowerCase()
    let disposed = false
    function connect() {
      if (disposed) return
      setStreamStatus('connecting')
      const socket = new WebSocket(getEventsWsUrl())
      wsRef.current = socket
      socket.onopen = () => {
        retryRef.current = 0
        setStreamStatus('connected')
        stopPolling()
      }
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WsEventMessage
          if (
            message.type === 'activity.created'
            && message.data.watchedAddress.toLowerCase() === monitoredAddress
          ) {
            setActivities((current) => mergeAccountActivities(current, message.data))
            setSelectedActivityId(message.data.id)
          }
        } catch {
          // Ignore malformed realtime frames; HTTP history remains authoritative.
        }
      }
      socket.onerror = () => {
        // onclose owns retry scheduling.
      }
      socket.onclose = () => {
        wsRef.current = null
        if (disposed) return
        if (retryRef.current < MAX_WS_RETRIES) {
          const delay = Math.min(1000 * 2 ** retryRef.current, 15_000)
          retryRef.current += 1
          setStreamStatus('disconnected')
          retryTimerRef.current = setTimeout(connect, delay)
        } else {
          startPolling()
        }
      }
    }

    const timer = setTimeout(connect, 0)
    return () => {
      disposed = true
      clearTimeout(timer)
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
      wsRef.current?.close()
      wsRef.current = null
      stopPolling()
    }
  }, [account, startPolling, stopPolling])

  const enable = useCallback(async (address: HexAddress) => {
    setState('loading')
    setError(null)
    try {
      const watch = await setAccountMonitoring(address, true)
      setAccount(watch)
      accountRef.current = watch
      if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, watch.address)
      await loadActivities(watch.address)
      setState('active')
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Agent Mode could not be enabled.')
      setState('error')
    }
  }, [loadActivities])

  const disable = useCallback(async () => {
    if (!account) return
    setState('loading')
    setError(null)
    try {
      const watch = await setAccountMonitoring(account.address, false)
      setAccount(watch)
      accountRef.current = watch
      setStreamStatus('disconnected')
      setState('paused')
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'Agent Mode could not be paused.')
      setState('error')
    }
  }, [account])

  const selectActivity = useCallback((activity: AccountActivity) => {
    setSelectedActivityId(activity.id)
  }, [])

  return {
    account,
    activities,
    selectedActivityId,
    selectedActivity: activities.find((activity) => activity.id === selectedActivityId) ?? null,
    state,
    streamStatus,
    error,
    enable,
    disable,
    selectActivity,
    refresh,
  }
}
