import { getQuotations } from "@/app/actions/quotations"
import { getOpportunities } from "@/app/actions/crm"
import { QuotationsClient } from "@/components/crm/quotations-client"
import { requireModuleAccess } from "@/lib/auth-guard"

export const dynamic = 'force-dynamic'

export default async function QuotationsPage() {
  // Server-side authentication and role-based authorization
  await requireModuleAccess('quotations')
  
  const [quotations, opportunities] = await Promise.all([
    getQuotations(),
    getOpportunities()
  ])
  
  return <QuotationsClient quotations={quotations} opportunities={opportunities} />
}
