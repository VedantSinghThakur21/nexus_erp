/** Shared CRM AI heuristics — used when Dify is unavailable and for instant UI. */

export type LeadScoreInput = {
  name: string
  status?: string
  email_id?: string
  mobile_no?: string
  company_name?: string
  job_title?: string
  source?: string
  industry?: string
  has_email?: boolean
  has_phone?: boolean
  has_company?: boolean
  has_job_title?: boolean
}

export function calculateLeadScore(lead: LeadScoreInput): number {
  let score = 40
  const hasEmail = lead.has_email ?? Boolean(lead.email_id)
  const hasPhone = lead.has_phone ?? Boolean(lead.mobile_no)
  const hasCompany = lead.has_company ?? Boolean(lead.company_name)
  const hasTitle = lead.has_job_title ?? Boolean(lead.job_title)

  if (hasEmail) score += 10
  if (hasPhone) score += 8
  if (hasCompany) score += 12
  if (hasTitle) score += 8
  if (lead.source) score += 5
  if (lead.industry) score += 5

  switch (lead.status) {
    case 'Interested':
      score += 18
      break
    case 'Replied':
      score += 12
      break
    case 'Opportunity':
    case 'Quotation':
      score += 20
      break
    case 'Open':
      score += 6
      break
    case 'Do Not Contact':
    case 'Lost Quotation':
      score -= 25
      break
    default:
      break
  }

  return Math.min(100, Math.max(0, score))
}

export function leadScoreTier(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 75) return 'hot'
  if (score >= 50) return 'warm'
  return 'cold'
}

export function leadScoreLabel(score: number): string {
  const tier = leadScoreTier(score)
  if (tier === 'hot') return 'High intent'
  if (tier === 'warm') return 'Moderate intent'
  return 'Needs nurturing'
}

export function calculateOpportunityProbability(input: {
  sales_stage?: string
  probability?: number
  opportunity_amount?: number
  expected_closing?: string
}): number {
  if (typeof input.probability === 'number' && input.probability > 0) {
    return Math.min(100, Math.max(0, input.probability))
  }

  const stageMap: Record<string, number> = {
    Prospecting: 10,
    Qualification: 25,
    'Proposal/Price Quote': 45,
    'Perception Analysis': 50,
    'Value Proposition': 55,
    'Negotiation/Review': 70,
    Won: 100,
    Lost: 0,
  }

  let prob = stageMap[input.sales_stage || ''] ?? 30

  if (input.opportunity_amount && input.opportunity_amount > 500000) prob += 5
  if (input.expected_closing) {
    const days = (new Date(input.expected_closing).getTime() - Date.now()) / 86400000
    if (days < 0) prob -= 15
    else if (days <= 14) prob += 8
  }

  return Math.min(100, Math.max(0, prob))
}

export function opportunityHealthLabel(probability: number): 'On Track' | 'Stalled' | 'At Risk' {
  if (probability >= 75) return 'On Track'
  if (probability >= 40) return 'Stalled'
  return 'At Risk'
}

export function leadInsightSummary(lead: LeadScoreInput, score: number): string {
  const gaps: string[] = []
  if (!lead.email_id && !lead.has_email) gaps.push('missing email')
  if (!lead.mobile_no && !lead.has_phone) gaps.push('missing phone')
  if (!lead.company_name && !lead.has_company) gaps.push('no company on file')

  if (lead.status === 'Do Not Contact') {
    return 'This lead is marked do-not-contact — avoid outbound until status changes.'
  }
  if (score >= 75) {
    return gaps.length
      ? `Strong lead profile (${score}/100). Consider converting soon; still ${gaps.join(', ')}.`
      : `Strong lead profile (${score}/100) — good candidate for qualification or conversion.`
  }
  if (score >= 50) {
    return gaps.length
      ? `Moderate fit (${score}/100). Next step: fill ${gaps.join(' and ')} and schedule follow-up.`
      : `Moderate fit (${score}/100) — a timely follow-up could move this forward.`
  }
  return gaps.length
    ? `Low completeness (${score}/100). Enrich with ${gaps.join(', ')} before heavy outreach.`
    : `Low score (${score}/100) — nurture with email or call before pushing to opportunity.`
}

export function opportunityInsightSummary(input: {
  sales_stage?: string
  probability: number
  opportunity_amount?: number
  expected_closing?: string
  party_name?: string
  customer_name?: string
}): string {
  const label = opportunityHealthLabel(input.probability)
  const name = input.customer_name || input.party_name || 'This deal'
  const amount = input.opportunity_amount
    ? ` valued at ₹${Number(input.opportunity_amount).toLocaleString('en-IN')}`
    : ''

  if (label === 'On Track') {
    return `${name}${amount} looks healthy at ${input.probability}% win probability. Focus on closing before the expected date.`
  }
  if (label === 'Stalled') {
    return `${name}${amount} is at ${input.probability}% — stage "${input.sales_stage || 'Unknown'}" may need a nudge (proposal review or exec sponsor).`
  }
  return `${name}${amount} is at risk (${input.probability}%). Re-qualify budget, timeline, and decision maker before the close date slips.`
}
