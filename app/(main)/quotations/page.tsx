import { getQuotations } from "@/app/actions/quotations"
import { QuotationsClient } from "@/components/crm/quotations-client"

export const dynamic = 'force-dynamic'

export default async function QuotationsPage() {
  const quotations = await getQuotations()
  return <QuotationsClient quotations={quotations} />
}
