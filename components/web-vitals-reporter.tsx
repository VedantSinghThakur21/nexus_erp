"use client"

import { useEffect } from "react"

type Metric = {
  id: string
  name: string
  value: number
  rating: string
}

/**
 * Ships Web Vitals to console in dev and to `navigator.sendBeacon` / `fetch`
 * when `NEXT_PUBLIC_ANALYTICS_WEB_VITALS` is a same-origin POST URL (optional).
 */
export function WebVitalsReporter() {
  useEffect(() => {
    let cancelled = false

    async function attach() {
      const { onCLS, onINP, onLCP, onTTFB, onFCP } = await import("web-vitals")

      const send = (metric: Metric) => {
        if (process.env.NODE_ENV === "development") {
          console.debug(`[vitals] ${metric.name}`, metric.value, metric.rating, metric.id)
        }
        const url = process.env.NEXT_PUBLIC_ANALYTICS_WEB_VITALS
        if (!url) return

        const body = JSON.stringify({
          metric: metric.name,
          value: metric.value,
          rating: metric.rating,
          id: metric.id,
          path: typeof window !== "undefined" ? window.location.pathname : "",
        })

        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: "application/json" })
          navigator.sendBeacon(url, blob)
        } else {
          void fetch(url, { body, method: "POST", keepalive: true, headers: { "Content-Type": "application/json" } })
        }
      }

      if (cancelled) return
      const opts = { reportAllChanges: process.env.NODE_ENV === "development" } as const
      onCLS(send, opts)
      onINP(send, opts)
      onLCP(send, opts)
      onTTFB(send)
      onFCP(send, opts)
    }

    void attach()
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
