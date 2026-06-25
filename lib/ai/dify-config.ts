/** Dify API URL and per-action key resolution (with CRM fallback). */

export function getDifyApiUrl(): string {
  return (
    process.env.DIFY_API_URL ||
    process.env.NEXT_PUBLIC_DIFY_API_URL ||
    'https://api.dify.ai/v1'
  )
}

export function resolveDifyApiKey(action: string): string {
  const crm = process.env.DIFY_CRM_API_KEY || ''

  switch (action) {
    case 'risk-score':
      return process.env.DIFY_RISK_API_KEY || ''
    case 'forecast':
      return process.env.DIFY_FORECAST_API_KEY || ''
    case 'fraud-check':
      return process.env.DIFY_FRAUD_API_KEY || ''
    case 'crm-insights':
      return crm
    case 'lead-score':
      return process.env.DIFY_LEAD_SCORE_API_KEY || crm
    case 'opportunity-probability':
      return process.env.DIFY_OPPORTUNITY_PROB_API_KEY || crm
    default:
      return ''
  }
}

/** When using the shared CRM workflow for scoring tasks, tag the payload. */
export function buildDifyInputs(
  action: string,
  inputs: Record<string, unknown> | undefined
): Record<string, unknown> {
  const base = inputs || {}
  const usesCrmFallback =
    (action === 'lead-score' && !process.env.DIFY_LEAD_SCORE_API_KEY && process.env.DIFY_CRM_API_KEY) ||
    (action === 'opportunity-probability' &&
      !process.env.DIFY_OPPORTUNITY_PROB_API_KEY &&
      process.env.DIFY_CRM_API_KEY)

  if (action === 'lead-score' && base.leads_data != null && base.pipeline_data == null) {
    return {
      ...base,
      pipeline_data: base.leads_data,
      ...(usesCrmFallback ? { analysis_task: 'lead_score' } : {}),
    }
  }

  if (action === 'opportunity-probability' && usesCrmFallback) {
    return {
      ...base,
      pipeline_data: base.pipeline_data ?? base.opportunity_data,
      analysis_task: 'opportunity_probability',
    }
  }

  if (action === 'forecast' && base.catalogue_summary != null && base.booking_history == null) {
    return { ...base, booking_history: base.catalogue_summary }
  }

  if (!usesCrmFallback) return base

  return {
    ...base,
    pipeline_data: base.pipeline_data ?? base.leads_data ?? base.opportunity_data,
    analysis_task: action === 'lead-score' ? 'lead_score' : 'opportunity_probability',
  }
}
