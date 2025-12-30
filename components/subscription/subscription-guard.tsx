'use client'

import { SubscriptionTier, canAccessFeature } from '@/types/subscription'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface SubscriptionGuardProps {
  currentPlan: SubscriptionTier
  requiredPlan: SubscriptionTier
  feature: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function SubscriptionGuard({
  currentPlan,
  requiredPlan,
  feature,
  children,
  fallback
}: SubscriptionGuardProps) {
  const hasAccess = canAccessFeature(currentPlan, requiredPlan)

  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <Card className="border-2 border-dashed border-slate-300 bg-slate-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-slate-500" />
          <CardTitle className="text-lg">Upgrade Required</CardTitle>
        </div>
        <CardDescription>
          This feature requires a {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} plan or higher
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 mb-4">
          <strong>{feature}</strong> is available on our {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} plan.
          Upgrade now to unlock this and many more features.
        </p>
        <Link href="/settings/billing">
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            Upgrade to {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
