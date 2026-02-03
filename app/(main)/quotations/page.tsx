import { getQuotations } from "@/app/actions/quotations"
import { getOpportunities } from "@/app/actions/crm"

export const dynamic = 'force-dynamic'

export default async function QuotationsPage() {
  const [quotations, opportunities] = await Promise.all([
    getQuotations(),
    getOpportunities()
  ])
  
  // Filter opportunities ready for quotation (Proposal/Price Quote stage)
  const proposalOpportunities = opportunities.filter(opp => 
    opp.status === 'Open' && opp.sales_stage === 'Proposal/Price Quote'
  )

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl lg:text-4xl font-bold text-slate-900 dark:text-white">
            Quotations
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Create and manage quotations for customers and leads
          </p>
        </div>
      </div>

      {/* Quotations View with Tabs */}
      <QuotationsView quotations={quotations} proposalOpportunities={proposalOpportunities} />
    </div>
  )
}
