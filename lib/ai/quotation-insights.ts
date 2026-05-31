import { daysFromToday, validityLabel } from '@/lib/ai/date-utils'

export type QuotationInsightInput = {
  name: string
  customer_name?: string
  party_name?: string
  status: string
  valid_till?: string
  grand_total: number
}

export function quotationHealthScore(quotations: QuotationInsightInput[]): number {
  if (quotations.length === 0) return 0
  const open = quotations.filter((q) => ['Open', 'Sent', 'Ordered'].includes(q.status))
  const expired = quotations.filter((q) => {
    const days = daysFromToday(q.valid_till)
    return days !== null && days < 0 && q.status !== 'Ordered' && q.status !== 'Cancelled'
  })
  const openRatio = open.length / quotations.length
  const expiredPenalty = expired.length / quotations.length
  return Math.min(100, Math.max(0, Math.round(openRatio * 70 + 30 - expiredPenalty * 35)))
}

export function quotationHealthLabel(score: number): string {
  if (score >= 75) return 'Strong pipeline'
  if (score >= 50) return 'Moderate momentum'
  if (score > 0) return 'Needs follow-up'
  return 'No quotations yet'
}

export function expiringQuotations(quotations: QuotationInsightInput[]): QuotationInsightInput[] {
  return quotations
    .filter((q) => {
      if (['Ordered', 'Cancelled'].includes(q.status)) return false
      const days = daysFromToday(q.valid_till)
      return days !== null && days >= 0 && days <= 14
    })
    .sort((a, b) => (daysFromToday(a.valid_till) ?? 99) - (daysFromToday(b.valid_till) ?? 99))
}

export function atRiskQuotations(quotations: QuotationInsightInput[]): QuotationInsightInput[] {
  return quotations.filter((q) => {
    if (['Ordered', 'Cancelled'].includes(q.status)) return false
    const label = validityLabel(q.valid_till)
    return label.text === 'Expired' || q.status === 'Draft'
  })
}

export { validityLabel }
