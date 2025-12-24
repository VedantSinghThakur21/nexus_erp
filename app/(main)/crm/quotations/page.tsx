import { getQuotations, getOpportunities } from "@/app/actions/crm"
import { QuotationsView } from "@/components/crm/quotations-view"

export default async function QuotationsPage() {
  const [quotations, opportunities] = await Promise.all([
    getQuotations(),
    getOpportunities()
  ])

  // Filter opportunities in Proposal/Price Quote stage
  const proposalOpportunities = opportunities.filter(
    opp => opp.sales_stage === 'Proposal/Price Quote' && opp.status === 'Open'
  )

  return <QuotationsView quotations={quotations} proposalOpportunities={proposalOpportunities} />
}


