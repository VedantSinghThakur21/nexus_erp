'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, Zap } from 'lucide-react'
import { PLAN_FEATURES, type SubscriptionPlan } from '@/types/tenant'
import { useRouter } from 'next/navigation'

interface UpgradePromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  limitType: 'users' | 'leads' | 'projects' | 'invoices'
  currentPlan: SubscriptionPlan
  currentUsage: number
  limit: number
}

export function UpgradePrompt({
  open,
  onOpenChange,
  limitType,
  currentPlan,
  currentUsage,
  limit
}: UpgradePromptProps) {
  const router = useRouter()
  
  const limitLabels: Record<string, string> = {
    users: 'team members',
    leads: 'leads',
    projects: 'projects',
    invoices: 'invoices'
  }

  const recommendedPlan: SubscriptionPlan = currentPlan === 'free' ? 'pro' : 'enterprise'
  const planFeatures = PLAN_FEATURES[recommendedPlan]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription>
            You've reached your limit of {limit} {limitLabels[limitType]} on the {PLAN_FEATURES[currentPlan].name} plan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm">
              <span className="font-semibold">Current usage:</span> {currentUsage} / {limit} {limitLabels[limitType]}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Upgrade to continue growing your business without limits.
            </p>
          </div>

          <Card className="p-6 border-2 border-primary">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold">{planFeatures.name}</h3>
                <p className="text-muted-foreground">Recommended for you</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">₹{planFeatures.price.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">per month</div>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  <strong>{planFeatures.features[limitType]}</strong> {limitLabels[limitType]}
                  {planFeatures.features[limitType] === 'unlimited' && ' - No limits!'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  {planFeatures.features.support} support
                </span>
              </div>

              {planFeatures.features.api_access && (
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">API Access</span>
                </div>
              )}

              {planFeatures.features.advanced_reports && (
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Advanced Reports</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                onClick={() => {
                  router.push('/settings?tab=billing')
                  onOpenChange(false)
                }}
              >
                Upgrade to {planFeatures.name}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Maybe Later
              </Button>
            </div>
          </Card>

          <p className="text-xs text-center text-muted-foreground">
            Need more? Contact us for Enterprise plans with custom limits.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
