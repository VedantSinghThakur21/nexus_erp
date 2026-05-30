/** Heuristic CRM pipeline insights when Dify crm-insights workflow is unavailable. */

type PipelineDeal = {
  customer?: string
  days_inactive?: number
  reason?: string
}

type PipelineOpportunity = {
  customer?: string
  stage?: string
  amount?: number
  probability?: number
}

type PipelinePayload = {
  at_risk_pipeline?: PipelineDeal[]
  high_probability_pipeline?: PipelineOpportunity[]
}

export type CrmInsightsHeuristic = {
  executive_summary: string
  at_risk_analysis?: {
    identified_risk_deals: string[]
    risk_factors: string[]
    recommended_mitigation: string
  }
  opportunity_analysis?: {
    top_prospects: string[]
    key_drivers: string[]
    recommended_closing_actions: string[]
  }
  source: 'heuristic'
}

export function buildCrmInsightsHeuristic(
  inputs: Record<string, unknown> | undefined
): CrmInsightsHeuristic {
  let payload: PipelinePayload = {}
  const raw = inputs?.pipeline_data
  if (typeof raw === 'string') {
    try {
      payload = JSON.parse(raw) as PipelinePayload
    } catch {
      payload = {}
    }
  } else if (raw && typeof raw === 'object') {
    payload = raw as PipelinePayload
  }

  const atRisk = payload.at_risk_pipeline ?? []
  const hot = payload.high_probability_pipeline ?? []

  const riskNames = atRisk.map((d) => d.customer || 'Unknown deal').filter(Boolean)
  const riskFactors = atRisk.map(
    (d) => d.reason || `${d.days_inactive ?? '?'} days since last activity`
  )
  const hotNames = hot.map((o) => o.customer || 'Unknown').filter(Boolean)

  const summaryParts: string[] = []
  if (hot.length > 0) {
    summaryParts.push(
      `${hot.length} high-probability deal${hot.length === 1 ? '' : 's'} ready for closing focus.`
    )
  }
  if (atRisk.length > 0) {
    summaryParts.push(
      `${atRisk.length} deal${atRisk.length === 1 ? '' : 's'} need re-engagement before they stall.`
    )
  }
  if (summaryParts.length === 0) {
    summaryParts.push('Pipeline is quiet — add leads or advance open opportunities to generate insights.')
  }

  return {
    executive_summary: summaryParts.join(' '),
    at_risk_analysis:
      atRisk.length > 0
        ? {
            identified_risk_deals: riskNames,
            risk_factors: riskFactors,
            recommended_mitigation:
              'Schedule owner follow-ups on inactive deals and confirm budget, timeline, and decision maker.',
          }
        : undefined,
    opportunity_analysis:
      hot.length > 0
        ? {
            top_prospects: hotNames,
            key_drivers: hot.map((o) =>
              o.stage ? `${o.stage} stage` : 'Strong win probability'
            ),
            recommended_closing_actions: hot.map((o) => {
              const amt = o.amount ? ` (₹${Number(o.amount).toLocaleString('en-IN')})` : ''
              return `Close ${o.customer || 'prospect'}${amt} — ${o.probability ?? '?'}% probability`
            }),
          }
        : undefined,
    source: 'heuristic',
  }
}
