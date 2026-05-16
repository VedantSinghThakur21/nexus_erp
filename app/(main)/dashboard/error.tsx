'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard]', error)
  }, [error])

  return (
    <div className="app-shell flex flex-col items-center justify-center p-8">
      <h2 className="text-lg font-semibold text-foreground">Dashboard unavailable</h2>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        {error.message || 'We could not load dashboard data from ERPNext.'}
      </p>
      <Button type="button" className="mt-4" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  )
}
