'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeSsoLogin } from '@/app/actions/user-auth'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Post-Google-OAuth handoff: resolve tenant by email, mint API keys, redirect to workspace.
 */
export function SsoCompleteClient() {
  const router = useRouter()
  const [tenantChoices, setTenantChoices] = useState<
    { subdomain: string; label: string }[] | null
  >(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function finish(subdomain?: string) {
    setLoading(true)
    setError(null)
    const result = await completeSsoLogin(subdomain)
    if (result.success && result.redirectUrl) {
      window.location.href = result.redirectUrl
      return
    }
    if (result.tenantChoices?.length) {
      setTenantChoices(result.tenantChoices)
      setLoading(false)
      return
    }
    setError(result.error || 'Could not complete sign-in')
    setLoading(false)
  }

  useEffect(() => {
    void finish()
  }, [])

  if (loading && !tenantChoices) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-neutral-400">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Finding your workspace…</p>
      </div>
    )
  }

  if (tenantChoices && tenantChoices.length > 0) {
    return (
      <div className="space-y-4 py-4">
        <p className="text-sm text-neutral-300 text-center">
          You have access to multiple workspaces. Choose one to continue:
        </p>
        <div className="space-y-2">
          {tenantChoices.map((t) => (
            <Button
              key={t.subdomain}
              type="button"
              variant="outline"
              className="w-full justify-start border-white/10 bg-white/5 text-neutral-100 hover:bg-white/10"
              onClick={() => void finish(t.subdomain)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center space-y-4">
        <p className="text-sm text-red-300">{error}</p>
        <Button type="button" variant="outline" onClick={() => router.push('/login')}>
          Back to sign in
        </Button>
      </div>
    )
  }

  return null
}
