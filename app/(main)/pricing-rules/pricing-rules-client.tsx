'use client'

import { useState } from 'react'
import { getPricingRules, togglePricingRuleStatus } from '@/app/actions/pricing-rules'
import { PricingRulesClient } from '@/components/pricing-rules/pricing-rules-client'

type PricingRule = Awaited<ReturnType<typeof getPricingRules>>[number]

export function PricingRulesPageClient(props: { initialRules: PricingRule[] }) {
  const [rules, setRules] = useState<PricingRule[]>(props.initialRules)
  const [loading, setLoading] = useState(false)

  async function loadRules() {
    setLoading(true)
    try {
      const data = await getPricingRules()
      setRules(data)
    } catch (error) {
      console.error('[Pricing Rules Page] Failed to load pricing rules:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleStatus(ruleName: string, currentStatus: number) {
    try {
      await togglePricingRuleStatus(ruleName, currentStatus === 0 ? 1 : 0)
      await loadRules()
    } catch (error) {
      console.error('Failed to toggle rule status:', error)
    }
  }

  if (loading) {
    return (
      <div className="app-content flex min-h-[50vh] items-center justify-center">
        <div className="text-muted-foreground">Loading pricing rules...</div>
      </div>
    )
  }

  return <PricingRulesClient rules={rules as any} onToggleStatus={handleToggleStatus} />
}

