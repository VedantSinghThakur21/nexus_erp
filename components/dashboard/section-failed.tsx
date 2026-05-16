'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function DashboardSectionFailed({
  title,
  message,
}: {
  title: string
  message: string
}) {
  const router = useRouter()

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => router.refresh()}
      >
        Retry
      </Button>
    </div>
  )
}
