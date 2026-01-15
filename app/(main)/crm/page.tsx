import { getLeads, getCustomers } from "@/app/actions/crm"
import { LeadsDashboard } from "@/components/crm/leads-dashboard"

export const dynamic = 'force-dynamic'

export default async function CRMPage() {
  const leads = await getLeads()

  return <LeadsDashboard leads={leads} />
}

