'use client'

import { CheckCircle2 } from 'lucide-react'
import { SUBSCRIPTION_PLANS, type SubscriptionTier } from '@/types/subscription'
import { cn } from '@/lib/utils'

type PlanSelectionProps = {
  name?: string
  value: SubscriptionTier
  onChange: (plan: SubscriptionTier) => void
  disabled?: boolean
}

const PLAN_ORDER: SubscriptionTier[] = ['free', 'pro', 'enterprise']

const PLAN_HIGHLIGHTS: Record<SubscriptionTier, string> = {
  free: 'Start immediately, no payment required.',
  pro: 'For active sales and operations teams.',
  enterprise: 'For high-volume teams with advanced controls.',
}

export function PlanSelection({ name = 'plan', value, onChange, disabled }: PlanSelectionProps) {
  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-medium text-foreground">Choose your plan</legend>
      <input type="hidden" name={name} value={value} />

      <div className="grid gap-3 md:grid-cols-3">
        {PLAN_ORDER.map((planId) => {
          const plan = SUBSCRIPTION_PLANS[planId]
          const selected = value === planId
          const price = plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString('en-IN')}/mo`

          return (
            <button
              key={planId}
              type="button"
              onClick={() => onChange(planId)}
              disabled={disabled}
              className={cn(
                'rounded-xl border bg-card p-4 text-left transition hover:border-primary/70',
                selected ? 'border-primary ring-2 ring-primary/20' : 'border-border',
                disabled && 'cursor-not-allowed opacity-60'
              )}
              aria-pressed={selected}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{price}</p>
                </div>
                {selected && <CheckCircle2 className="h-5 w-5 text-primary" />}
              </div>

              <p className="mt-2 min-h-10 text-xs text-muted-foreground">{PLAN_HIGHLIGHTS[planId]}</p>

              <ul className="mt-3 space-y-1.5 text-[11px] text-muted-foreground">
                {plan.features.features.slice(0, 4).map((feature) => (
                  <li key={feature} className="flex gap-1.5">
                    <span className="text-primary">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

