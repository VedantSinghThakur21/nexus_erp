import { getPricingRules } from '@/app/actions/pricing-rules'
import { PricingRulesPageClient } from './pricing-rules-client'

export const dynamic = 'force-dynamic'

export default async function PricingRulesPage() {
  const initialRules = await getPricingRules()
  return <PricingRulesPageClient initialRules={initialRules} />
}

