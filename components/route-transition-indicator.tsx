'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Lightweight route transition indicator for App Router.
 * Uses pathname/searchParams changes as a signal to briefly show progress.
 */
export function RouteTransitionIndicator() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    // On any navigation, show a short indicator.
    setVisible(true)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setVisible(false), 500)
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams?.toString()])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed left-0 top-0 z-[60] h-[2px] w-full">
      <div className="h-full w-full origin-left animate-[nexusRouteBar_500ms_ease-out] bg-primary" />
      <style jsx global>{`
        @keyframes nexusRouteBar {
          0% { transform: scaleX(0.08); opacity: 0.7; }
          70% { transform: scaleX(0.85); opacity: 0.9; }
          100% { transform: scaleX(1); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

