import { describe, expect, it } from 'vitest'
import {
  calculateLeadScore,
  calculateOpportunityProbability,
  leadScoreTier,
  opportunityHealthLabel,
} from '@/lib/ai/crm-scoring'

describe('crm-scoring', () => {
  it('scores complete interested leads higher', () => {
    const score = calculateLeadScore({
      name: 'LEAD-1',
      status: 'Interested',
      email_id: 'a@b.com',
      mobile_no: '999',
      company_name: 'Acme',
      job_title: 'CEO',
      source: 'Web',
      industry: 'Tech',
    })
    expect(score).toBeGreaterThanOrEqual(75)
    expect(leadScoreTier(score)).toBe('hot')
  })

  it('penalizes do-not-contact leads', () => {
    const score = calculateLeadScore({
      name: 'LEAD-2',
      status: 'Do Not Contact',
      email_id: 'a@b.com',
    })
    expect(score).toBeLessThan(50)
  })

  it('estimates opportunity probability from stage', () => {
    const prob = calculateOpportunityProbability({ sales_stage: 'Negotiation/Review' })
    expect(prob).toBe(70)
    expect(opportunityHealthLabel(prob)).toBe('Stalled')
  })

  it('respects ERP probability when set', () => {
    expect(calculateOpportunityProbability({ probability: 42 })).toBe(42)
  })
})
