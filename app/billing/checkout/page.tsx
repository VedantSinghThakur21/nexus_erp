'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function CheckoutRedirectPage() {
  const params = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function startCheckout() {
      try {
        const response = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: params.get('plan') }),
        })
        const data = await response.json()
        if (!response.ok || !data.url) {
          throw new Error(data.error || 'Could not start checkout')
        }
        if (!cancelled) window.location.href = data.url
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not start checkout')
      }
    }

    startCheckout()
    return () => {
      cancelled = true
    }
  }, [params])

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <h1 className="mt-4 text-lg font-semibold text-foreground">Redirecting to secure checkout</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete payment to provision your workspace.
        </p>
        {error && <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}

