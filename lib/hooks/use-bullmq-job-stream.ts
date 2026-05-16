'use client'

import { useEffect, useRef, useState } from 'react'

export type BullmqStreamState = {
  state: string
  progress: number
  done: boolean
  failed: boolean
  error: string | null
}

/**
 * Subscribes to BullMQ job SSE (`/api/agent/jobs/...` or `/api/agentic/runs/.../stream`).
 */
export function useBullmqJobStream(streamUrl: string | null, enabled: boolean) {
  const [stream, setStream] = useState<BullmqStreamState>({
    state: 'waiting',
    progress: 0,
    done: false,
    failed: false,
    error: null,
  })
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!enabled || !streamUrl) return

    setStream({
      state: 'waiting',
      progress: 0,
      done: false,
      failed: false,
      error: null,
    })

    const es = new EventSource(streamUrl, { withCredentials: true })
    esRef.current = es

    const onTick = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as { state?: string; progress?: number }
        setStream((prev) => ({
          ...prev,
          state: data.state ?? prev.state,
          progress: typeof data.progress === 'number' ? data.progress : prev.progress,
        }))
      } catch {
        // ignore malformed tick
      }
    }

    const onCompleted = () => {
      setStream((prev) => ({ ...prev, done: true, state: 'completed', progress: 100 }))
      es.close()
    }

    const onFailed = (event: MessageEvent) => {
      let message = 'Job failed'
      try {
        const data = JSON.parse(event.data) as { failedReason?: string }
        if (data.failedReason) message = data.failedReason
      } catch {
        // ignore
      }
      setStream((prev) => ({ ...prev, failed: true, done: true, error: message, state: 'failed' }))
      es.close()
    }

    const onErrorEvent = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as { message?: string; code?: string }
        setStream((prev) => ({
          ...prev,
          error: data.message || data.code || 'Stream error',
        }))
      } catch {
        setStream((prev) => ({ ...prev, error: 'Stream error' }))
      }
    }

    es.addEventListener('tick', onTick)
    es.addEventListener('completed', onCompleted)
    es.addEventListener('failed', onFailed)
    es.addEventListener('error', onErrorEvent)

    es.onerror = () => {
      setStream((prev) => {
        if (prev.done) return prev
        return { ...prev, error: prev.error || 'Connection lost' }
      })
      es.close()
    }

    return () => {
      es.removeEventListener('tick', onTick)
      es.removeEventListener('completed', onCompleted)
      es.removeEventListener('failed', onFailed)
      es.removeEventListener('error', onErrorEvent)
      es.close()
      esRef.current = null
    }
  }, [streamUrl, enabled])

  return stream
}
