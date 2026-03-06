import { getLeads, getOpportunities } from "@/app/actions/crm"
import { LeadsDashboard } from "@/components/crm/leads-dashboard"

export const dynamic = 'force-dynamic'

export default async function CRMPage() {
  const [leads, opportunities] = await Promise.all([
    getLeads(),
    getOpportunities()
  ])

  return <LeadsDashboard leads={leads} opportunities={opportunities} />
}

