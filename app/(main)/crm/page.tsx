import { getLeads, getCustomers } from "@/app/actions/crm"
import { LeadsContentWorkspace } from "@/components/crm/leads-content-workspace"

export const dynamic = 'force-dynamic'

export default async function CRMPage() {
  const leads = await getLeads()

  return <LeadsContentWorkspace leads={leads} />
}

