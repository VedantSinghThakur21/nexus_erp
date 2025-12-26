import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AnimatedCard, AnimatedButton } from "@/components/ui/animated"
import { Plus, FileText, CheckCircle, Clock, XCircle, Search, Filter } from "lucide-react"
import Link from "next/link"
import { getQuotations, getQuotationStats } from "@/app/actions/quotations"
import { getOpportunities } from "@/app/actions/crm"
import { QuotationsView } from "@/components/crm/quotations-view"

export default async function QuotationsPage() {
  // Fetch real data from ERPNext
  const quotations = await getQuotations()
  const stats = await getQuotationStats()
  const opportunities = await getOpportunities()
  
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <AnimatedCard className="p-4" variant="glass" delay={0}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Draft</p>
              <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{stats.draft}</p>
            </div>
            <FileText className="h-5 w-5 text-slate-400" />
          </div>
        </AnimatedCard>

        <AnimatedCard className="p-4" variant="glass" delay={0.1}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Sent</p>
              <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{stats.sent}</p>
            </div>
            <Clock className="h-5 w-5 text-blue-500" />
          </div>
        </AnimatedCard>

        <AnimatedCard className="p-4" variant="glass" delay={0.2}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Accepted</p>
              <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{stats.accepted}</p>
            </div>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
        </AnimatedCard>

        <AnimatedCard className="p-4" variant="glass" delay={0.3}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Value</p>
              <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                ₹{stats.totalValue.toLocaleString()}
              </p>
            </div>
            <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </AnimatedCard>
      </div>

      {/* Quotations View with Tabs */}
      <QuotationsView quotations={quotations} proposalOpportunities={proposalOpportunities} />
    </div>
  )
}
