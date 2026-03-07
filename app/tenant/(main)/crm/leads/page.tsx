import { getLeads } from "@/app/actions/crm"
import { LeadsContentWorkspace } from "@/components/crm/leads-content-workspace"

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const leads = await getLeads()
  return <LeadsContentWorkspace leads={leads} />
}
