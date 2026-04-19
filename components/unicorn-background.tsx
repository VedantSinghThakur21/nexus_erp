"use client"

import { useTheme } from "next-themes"
import { useEffect, useRef } from "react"

export function UnicornBackground({ projectId }: { projectId: string }) {
  const { resolvedTheme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)

  const opacity = resolvedTheme === "dark" ? 0.3 : 0.15

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.US_SCRIPT_LOADED) return

    window.US_SCRIPT_LOADED = true
    const script = document.createElement("script")
    script.src = "https://cdn.unicorn.studio/v1.4.0/unicornStudio.umd.js"
    script.onload = () => {
      requestAnimationFrame(() => {
        window.unicornStudio?.init?.()
      })
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ opacity }}
      data-us-project={projectId}
    />
  )
}
