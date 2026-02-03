import { getQuotations } from "@/app/actions/crm"
import { getOpportunities } from "@/app/actions/crm"
import { QuotationsClient } from "@/components/crm/quotations-client"

export const dynamic = 'force-dynamic'

export default async function QuotationsPage() {
  const quotations = await getQuotations()
  const opportunities = await getOpportunities()
  return <QuotationsClient quotations={quotations} opportunities={opportunities} />
}


