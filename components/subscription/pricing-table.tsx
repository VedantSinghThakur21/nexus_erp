'use client'

import { SUBSCRIPTION_PLANS, SubscriptionTier } from '@/types/subscription'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'

interface PricingTableProps {
  currentPlan?: SubscriptionTier
  onSelectPlan?: (plan: SubscriptionTier) => void
}

export function PricingTable({ currentPlan, onSelectPlan }: PricingTableProps) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {Object.values(SUBSCRIPTION_PLANS).map((plan) => {
        const isCurrent = currentPlan === plan.id
        const isPopular = plan.id === 'pro'

        return (
          <Card 
            key={plan.id}
            className={`relative ${isPopular ? 'border-2 border-blue-600 shadow-lg' : ''}`}
          >
            {isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-blue-600">Most Popular</Badge>
              </div>
            )}
            
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-slate-900">
                    ₹{plan.price.toLocaleString()}
                  </span>
                  <span className="text-slate-600">/{plan.interval}</span>
                </div>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {plan.features.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-4">
                {isCurrent ? (
                  <Button disabled className="w-full">
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    onClick={() => onSelectPlan?.(plan.id)}
                    variant={isPopular ? 'default' : 'outline'}
                    className="w-full"
                  >
                    {plan.price === 0 ? 'Get Started' : 'Upgrade'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
