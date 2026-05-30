import { describe, expect, it } from 'vitest'
import { buildCrmInsightsHeuristic } from '@/lib/ai/crm-pipeline-insights'
import {
  invoiceAiInsight,
  projectAiInsight,
  quotationAiInsight,
  teamMemberAiInsight,
} from '@/lib/ai/document-insights'
import { resolveDifyApiKey } from '@/lib/ai/dify-config'

describe('document-insights', () => {
  it('flags draft quotations for follow-up', () => {
    const insight = quotationAiInsight({ status: 'Draft', grand_total: 1000 })
    expect(insight?.text).toBe('Follow-up Recommended')
  })

  it('flags overdue invoices as high risk', () => {
    const insight = invoiceAiInsight({
      status: 'Unpaid',
      due_date: '2020-01-01',
      grand_total: 50000,
    })
    expect(insight?.label).toBe('HIGH RISK')
  })

  it('detects past-due projects', () => {
    const insight = projectAiInsight({
      status: 'Open',
      percent_complete: 40,
      expected_end_date: '2020-01-01',
    })
    expect(insight.text).toBe('Past Due — At Risk')
  })

  it('flags inactive team members', () => {
    const insight = teamMemberAiInsight({ last_login: undefined })
    expect(insight?.message).toContain('Never logged in')
  })
})

describe('crm-pipeline-insights', () => {
  it('builds summary from pipeline payload', () => {
    const result = buildCrmInsightsHeuristic({
      pipeline_data: JSON.stringify({
        at_risk_pipeline: [{ customer: 'Acme', days_inactive: 14, reason: 'No reply' }],
        high_probability_pipeline: [{ customer: 'Globtel', probability: 80, stage: 'Negotiation' }],
      }),
    })
    expect(result.executive_summary).toContain('high-probability')
    expect(result.at_risk_analysis?.identified_risk_deals).toContain('Acme')
  })
})

describe('dify-config', () => {
  it('falls back lead-score to CRM key when dedicated key unset', () => {
    const prevLead = process.env.DIFY_LEAD_SCORE_API_KEY
    const prevCrm = process.env.DIFY_CRM_API_KEY
    delete process.env.DIFY_LEAD_SCORE_API_KEY
    process.env.DIFY_CRM_API_KEY = 'app-crm-test'
    expect(resolveDifyApiKey('lead-score')).toBe('app-crm-test')
    if (prevLead) process.env.DIFY_LEAD_SCORE_API_KEY = prevLead
    else delete process.env.DIFY_LEAD_SCORE_API_KEY
    if (prevCrm) process.env.DIFY_CRM_API_KEY = prevCrm
    else delete process.env.DIFY_CRM_API_KEY
  })
})
