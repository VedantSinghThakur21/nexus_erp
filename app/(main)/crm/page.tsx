import { getLeads, getOpportunities } from "@/app/actions/crm"
import { getAtRiskDeals, getRecentActivities } from "@/app/actions/dashboard"
import { LeadsDashboard } from "@/components/crm/leads-dashboard"

export const dynamic = 'force-dynamic'

const CRM_MODULES = ['crm', 'quotations', 'sales-orders']

export default async function CRMPage() {
  const [leads, opportunities, atRiskDeals, recentActivities] = await Promise.all([
    getLeads(),
    getOpportunities(),
    getAtRiskDeals(CRM_MODULES),
    getRecentActivities(CRM_MODULES),
  ])

  return (
    <LeadsDashboard
      leads={leads}
      opportunities={opportunities}
      atRiskDeals={atRiskDeals}
      recentActivities={recentActivities}
    />
  )
}

