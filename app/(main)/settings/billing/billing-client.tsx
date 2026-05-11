'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PricingTable } from '@/components/subscription/pricing-table'
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from '@/types/subscription'

type CurrentSubscription = {
  tenant: { name?: string; subdomain?: string } | null
  plan: SubscriptionTier
  status: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
}

async function postJson(url: string, body?: unknown): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data
}

export function BillingClient(props: { current: CurrentSubscription }) {
  const router = useRouter()
  const [busy, setBusy] = useState<null | 'portal' | 'upgrade' | 'refresh'>(null)
  const [current, setCurrent] = useState<CurrentSubscription>(props.current)

  const currentPlan = SUBSCRIPTION_PLANS[current.plan]
  const isTenantWorkspace = !!current.tenant?.subdomain

  const canUpgrade = useMemo(() => {
    // For master workspace, billing is not relevant.
    return isTenantWorkspace
  }, [isTenantWorkspace])

  async function openPortal() {
    setBusy('portal')
    try {
      const { url } = await postJson('/api/billing/portal')
      window.location.assign(url)
    } finally {
      setBusy(null)
    }
  }

  async function handleSelectPlan(plan: SubscriptionTier) {
    if (plan === current.plan) return

    // We use Stripe Billing Portal for upgrades/downgrades (tenant must be linked to Stripe).
    setBusy('upgrade')
    try {
      const { url } = await postJson('/api/billing/portal')
      window.location.assign(url)
    } finally {
      setBusy(null)
    }
  }

  async function refreshSubscription() {
    if (!isTenantWorkspace) return
    setBusy('refresh')
    try {
      const sync = await postJson('/api/subscription/sync')
      // Best-effort: update UI immediately from sync response.
      if (sync?.plan && sync?.status) {
        setCurrent((prev) => ({
          ...prev,
          plan: sync.plan,
          status: sync.status,
        }))
      }
      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-slate-600 mt-2">Manage your subscription and billing information</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Current Plan</CardTitle>
                <Badge variant={props.current.status === 'active' ? 'default' : 'secondary'}>
                  {props.current.status}
                </Badge>
              </div>
              <CardDescription>You are currently on the {currentPlan.name} plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">₹{currentPlan.price.toLocaleString()}</span>
                <span className="text-slate-600">/{currentPlan.interval}</span>
              </div>

              {!canUpgrade ? (
                <div className="text-sm text-muted-foreground">
                  Billing controls are only available inside a tenant workspace.
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => void openPortal()} disabled={busy !== null}>
                    {busy === 'portal' ? 'Opening…' : 'Manage billing'}
                  </Button>
                  <Button variant="outline" onClick={() => void openPortal()} disabled={busy !== null}>
                    {busy === 'portal' ? 'Opening…' : 'Update payment method'}
                  </Button>
                  <Button variant="outline" onClick={() => void refreshSubscription()} disabled={busy !== null}>
                    {busy === 'refresh' ? 'Refreshing…' : 'Refresh subscription'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspace</CardTitle>
            <CardDescription>Subscription is tied to your tenant</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <div>
              <span className="font-medium text-foreground">Tenant:</span>{' '}
              {current.tenant?.subdomain || 'master'}
            </div>
            {current.stripe_customer_id && (
              <div>
                <span className="font-medium text-foreground">Stripe customer:</span>{' '}
                {current.stripe_customer_id}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Available Plans</h2>
        <PricingTable currentPlan={current.plan} onSelectPlan={handleSelectPlan} />
        {canUpgrade && (
          <p className="text-xs text-muted-foreground mt-3">
            Plan changes are completed in Stripe Billing Portal.
          </p>
        )}
      </div>
    </div>
  )
}

