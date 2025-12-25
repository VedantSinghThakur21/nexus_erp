import { getLeads, getCustomers } from "@/app/actions/crm"
import { LeadsDashboard } from "@/components/crm/leads-dashboard"

export default async function CRMPage() {
  const leads = await getLeads()

  return <LeadsDashboard leads={leads} />
}

