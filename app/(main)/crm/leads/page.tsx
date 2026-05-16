import { LeadsContentWorkspace } from "@/components/crm/leads-content-workspace"
import { getCachedLeads } from "@/lib/crm/cached-leads"

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const leads = await getCachedLeads()
  return <LeadsContentWorkspace leads={leads} />
}
