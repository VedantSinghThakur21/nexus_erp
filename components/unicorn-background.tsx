'use client'

import { useEffect, useRef } from 'react'

interface UnicornBackgroundProps {
  projectId: string
  className?: string
}

/**
 * Unicorn Studio WebGL Animated Background Component
 *
 * A reusable, production-ready component that safely loads and initializes
 * Unicorn Studio animations as a full-screen background.
 *
 * Features:
 * - Prevents duplicate script loading
 * - Handles cleanup on unmount
 * - Full TypeScript support
 * - Proper error handling
 * - Memory leak prevention
 * - Works with Next.js App Router
 *
 * @example
 * <UnicornBackground projectId="bmaMERjX2VZDtPrh4Zwx" />
 */
export function UnicornBackground({ projectId, className = '' }: UnicornBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  useEffect(() => {
    // Skip if we're on the server
    if (typeof window === 'undefined') return

    // Check if script is already loaded
    const isScriptLoaded = window.US_SCRIPT_LOADED || document.querySelector('script[src*="unicornStudio"]')

    if (isScriptLoaded && window.unicornStudio) {
      // Script already loaded, just initialize if needed
      initializeUnicornStudio(projectId)
      return
    }

    // Load the Unicorn Studio script
    scriptRef.current = document.createElement('script')
    scriptRef.current.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.34/dist/unicornStudio.umd.js'
    scriptRef.current.async = true
    scriptRef.current.onload = () => {
      // Mark script as loaded globally to prevent duplicate loading
      window.US_SCRIPT_LOADED = true
      initializeUnicornStudio(projectId)
    }
    scriptRef.current.onerror = () => {
      console.error('Failed to load Unicorn Studio script')
    }

    document.body.appendChild(scriptRef.current)

    // Cleanup function
    return () => {
      // Remove the script if it was added by this component
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current)
        scriptRef.current = null
      }
    }
  }, [projectId])

  return (
    <div
      ref={containerRef}
      data-us-project={projectId}
      className={`fixed inset-0 -z-10 overflow-hidden ${className}`}
      style={{
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        maskImage: 'linear-gradient(to bottom, transparent, black 0%, black 80%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 0%, black 80%, transparent)',
      }}
    />
  )
}

/**
 * Initialize Unicorn Studio with the given project ID
 * Handles cases where the script may not be fully loaded yet
 */
function initializeUnicornStudio(projectId: string) {
  if (typeof window === 'undefined') return

  // Wait for unicornStudio to be available (with timeout)
  const maxAttempts = 50
  let attempts = 0

  const checkAndInit = () => {
    if (window.unicornStudio) {
      try {
        // Initialize with project ID if init method exists
        if (typeof window.unicornStudio.init === 'function') {
          window.unicornStudio.init({ projectId })
        }
      } catch (error) {
        console.warn('Error initializing Unicorn Studio:', error)
      }
    } else if (attempts < maxAttempts) {
      attempts++
      requestAnimationFrame(checkAndInit)
    } else {
      console.warn('Unicorn Studio failed to initialize after multiple attempts')
    }
  }

  checkAndInit()
}

export default UnicornBackground
