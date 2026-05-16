import {
  getAtRiskDeals,
  getDashboardStats,
  getLeadsBySource,
  getOpportunities,
  getRecentActivities,
  getSalesPipelineFunnel,
} from '@/app/actions/dashboard'
import { formatIndianCurrency } from '@/lib/currency'

export type DashboardOpportunity = {
  name: string
  customer_name?: string
  party_name?: string
  sales_stage: string
  opportunity_amount: number
  probability: number
  status: string
  modified: string
}

export type DashboardStats = {
  pipelineValue: number
  revenue: number
  openOpportunities: number
  winRate: number
  winRateChange: number
  leadsChange: number
}

export type DashboardActivity = {
  type: 'closed-deal' | 'new-lead' | 'outbound' | 'booking-scheduled'
  owner: string
  company: string
  time: string
}

export type DashboardAtRisk = {
  name: string
  customer_name: string
  days_since_activity: number
  reason: string
}

export type DashboardLeadSource = {
  source: string
  count: number
  percentage: number
}

export type DashboardFunnelItem = {
  stage: string
  count: number
  value: string
  width: number
}

export type DashboardSectionError = {
  message: string
}

export type DashboardPayload = {
  stats: DashboardStats | null
  statsError: DashboardSectionError | null
  opportunities: DashboardOpportunity[] | null
  opportunitiesError: DashboardSectionError | null
  activities: DashboardActivity[] | null
  activitiesError: DashboardSectionError | null
  atRiskDeals: DashboardAtRisk[] | null
  atRiskError: DashboardSectionError | null
  leadSources: DashboardLeadSource[] | null
  leadSourcesError: DashboardSectionError | null
  funnelData: DashboardFunnelItem[] | null
  funnelError: DashboardSectionError | null
}

function sectionError(reason: unknown): DashboardSectionError {
  return {
    message: reason instanceof Error ? reason.message : 'Failed to load this section',
  }
}

function buildFunnel(
  funnelDataResult: Array<{ stage: string; count: number; value: number }>,
): DashboardFunnelItem[] {
  const maxCount = Math.max(...funnelDataResult.map((s) => s.count), 1)
  return funnelDataResult.map((item, index) => ({
    stage: item.stage,
    count: item.count,
    value: formatIndianCurrency(item.value),
    width: index === 0 ? 100 : Math.round((item.count / maxCount) * (100 - index * 10)),
  }))
}

/**
 * Loads all dashboard sections in one parallel wave; failures are isolated per section.
 */
export async function loadDashboardData(accessibleModules: string[]): Promise<DashboardPayload> {
  const [
    statsResult,
    oppsResult,
    activitiesResult,
    atRiskResult,
    leadSourcesResult,
    funnelResult,
  ] = await Promise.allSettled([
    getDashboardStats(accessibleModules),
    getOpportunities(accessibleModules),
    getRecentActivities(accessibleModules),
    getAtRiskDeals(accessibleModules),
    getLeadsBySource(accessibleModules),
    getSalesPipelineFunnel(accessibleModules),
  ])

  return {
    stats: statsResult.status === 'fulfilled' ? statsResult.value : null,
    statsError: statsResult.status === 'rejected' ? sectionError(statsResult.reason) : null,
    opportunities:
      oppsResult.status === 'fulfilled' ? (oppsResult.value as DashboardOpportunity[]) : null,
    opportunitiesError:
      oppsResult.status === 'rejected' ? sectionError(oppsResult.reason) : null,
    activities:
      activitiesResult.status === 'fulfilled'
        ? (activitiesResult.value as DashboardActivity[])
        : null,
    activitiesError:
      activitiesResult.status === 'rejected' ? sectionError(activitiesResult.reason) : null,
    atRiskDeals: atRiskResult.status === 'fulfilled' ? atRiskResult.value : null,
    atRiskError: atRiskResult.status === 'rejected' ? sectionError(atRiskResult.reason) : null,
    leadSources: leadSourcesResult.status === 'fulfilled' ? leadSourcesResult.value : null,
    leadSourcesError:
      leadSourcesResult.status === 'rejected' ? sectionError(leadSourcesResult.reason) : null,
    funnelData:
      funnelResult.status === 'fulfilled'
        ? buildFunnel(funnelResult.value as Array<{ stage: string; count: number; value: number }>)
        : null,
    funnelError: funnelResult.status === 'rejected' ? sectionError(funnelResult.reason) : null,
  }
}
