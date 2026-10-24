import { useCallback, useEffect, useRef, useState } from 'react'
import type { SecurityFinding } from '@ghostguard/shared'
import {
  fetchRecentFindings,
  getEventsWsUrl,
  type WsFindingCreatedMessage,
} from '../services/api'

export type StreamStatus = 'connecting' | 'connected' | 'disconnected' | 'polling'

export interface LiveNotification {
  id: string
  finding: SecurityFinding
  title: string
  message: string
  tone: 'verified' | 'suspicious' | 'review'
  receivedAt: number
}

interface UseLiveEventsOptions {
  enabled?: boolean
  onNewFinding?: (finding: SecurityFinding) => void
  pollingIntervalMs?: number
  maxWsRetries?: number
}

export function useLiveEvents({
  enabled = true,
  onNewFinding,
  pollingIntervalMs = 10000,
  maxWsRetries = 5,
}: UseLiveEventsOptions = {}) {
  const [status, setStatus] = useState<StreamStatus>('disconnected')
  const [notification, setNotification] = useState<LiveNotification | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onNewFindingRef = useRef(onNewFinding)
  const connectWsRef = useRef<() => void>(() => {})

  useEffect(() => {
    onNewFindingRef.current = onNewFinding
  }, [onNewFinding])

  const dismissNotification = useCallback(() => {
    setNotification(null)
  }, [])

  const triggerFindingAlert = useCallback((finding: SecurityFinding) => {
    let title = 'New Transfer Event Detected'
    let message = `Tx ${finding.transactionHash.slice(0, 10)}… block #${finding.blockNumber}`
    let tone: 'verified' | 'suspicious' | 'review' = 'review'

    if (finding.classification === 'VERIFIED_DEMO_TRANSFER') {
      title = 'Verified Transfer Indexed'
      message = `Legitimate DemoToken movement confirmed on Monad Testnet block #${finding.blockNumber}.`
      tone = 'verified'
    } else if (finding.classification === 'SUSPICIOUS_EVENT') {
      title = 'CRITICAL: Emitter Mismatch Detected!'
      message = `Decoy contract ${finding.actualEmitterAddress.slice(0, 10)}… emitted spoofed Transfer log!`
      tone = 'suspicious'
    }

    setNotification({
      id: `${finding.id}-${Date.now()}`,
      finding,
      title,
      message,
      tone,
      receivedAt: Date.now(),
    })
  }, [])

  // Process an incoming finding: call subscriber and show toast
  const handleIncomingFinding = useCallback(
    (finding: SecurityFinding) => {
      onNewFindingRef.current?.(finding)
      triggerFindingAlert(finding)
    },
    [triggerFindingAlert],
  )

  // HTTP polling fallback when WebSocket is unavailable
  const startHttpPolling = useCallback(() => {
    if (pollingIntervalRef.current) return
    setStatus('polling')

    async function poll() {
      try {
        const page = await fetchRecentFindings(10)
        if (page.items.length > 0) {
          page.items.forEach((item) => {
            onNewFindingRef.current?.(item)
          })
        }
      } catch {
        // Silent catch for polling when backend is offline
      }
    }

    void poll()
    pollingIntervalRef.current = setInterval(poll, pollingIntervalMs)
  }, [pollingIntervalMs])

  const stopHttpPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  // Establish WebSocket connection with exponential backoff
  const connectWs = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return

    // Clean up existing socket
    if (wsRef.current) {
      try {
        wsRef.current.close()
      } catch {}
      wsRef.current = null
    }

    setStatus('connecting')
    const wsUrl = getEventsWsUrl()

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setStatus('connected')
        retryCountRef.current = 0
        stopHttpPolling()
      }

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as WsFindingCreatedMessage
          if (payload?.type === 'finding.created' && payload.data) {
            handleIncomingFinding(payload.data)
          }
        } catch {
          // Ignore malformed WS frames
        }
      }

      ws.onerror = () => {
        // Socket error handled in onclose
      }

      ws.onclose = () => {
        wsRef.current = null

        if (retryCountRef.current < maxWsRetries) {
          // Exponential backoff: 1s, 2s, 4s, 8s, up to 15s
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 15000)
          retryCountRef.current += 1
          setStatus('disconnected')

          retryTimeoutRef.current = setTimeout(() => {
            connectWsRef.current()
          }, delay)
        } else {
          // Max retries reached: switch to HTTP polling fallback
          startHttpPolling()
        }
      }
    } catch {
      startHttpPolling()
    }
  }, [enabled, maxWsRetries, handleIncomingFinding, startHttpPolling, stopHttpPolling])

  useEffect(() => {
    connectWsRef.current = connectWs
  }, [connectWs])

  useEffect(() => {
    if (!enabled) {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      stopHttpPolling()
      return
    }

    // Schedule connection asynchronously to avoid synchronous effect setState warnings
    const initTimer = setTimeout(() => {
      connectWsRef.current()
    }, 0)

    return () => {
      clearTimeout(initTimer)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      stopHttpPolling()
    }
  }, [enabled, stopHttpPolling])

  // Allow manual event simulation for judge live demos
  const simulateFinding = useCallback(
    (finding: SecurityFinding) => {
      handleIncomingFinding(finding)
    },
    [handleIncomingFinding],
  )

  return {
    status,
    notification,
    dismissNotification,
    simulateFinding,
    reconnect: connectWs,
  }
}
