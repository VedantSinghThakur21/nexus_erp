'use client'

import { useEffect } from 'react'

/**
 * Root error boundary.
 *
 * Handles two known transient errors so users are never stuck:
 *
 * 1. "Failed to find Server Action" – browser cached the old action IDs from
 *    the previous deployment.  A hard reload picks up the new IDs.
 *
 * 2. Everything else – show a minimal user-facing error UI with a retry button.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Stale deployment: server action IDs changed since this page was loaded.
    if (error?.message?.includes('Failed to find Server Action')) {
      window.location.reload()
    }
  }, [error])

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center space-y-4 p-8">
        <h2 className="text-white text-xl font-semibold">Something went wrong</h2>
        <p className="text-slate-400 text-sm max-w-sm">
          {error?.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
