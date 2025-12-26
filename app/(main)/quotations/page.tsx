import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AnimatedCard, AnimatedButton } from "@/components/ui/animated"
import { Plus, FileText, CheckCircle, Clock, XCircle, Search, Filter } from "lucide-react"
import Link from "next/link"
import { getQuotations, getQuotationStats } from "@/app/actions/quotations"

export default async function QuotationsPage() {
  // Fetch real data from ERPNext
  const quotations = await getQuotations()
  const stats = await getQuotationStats()

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
        <Link href="/quotations/new">
          <AnimatedButton variant="neon" className="gap-2">
            <Plus className="h-4 w-4" /> New Quotation
          </AnimatedButton>
        </Link>
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

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search quotations..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" /> Filter
        </Button>
      </div>

      {/* Quotations Table */}
      <AnimatedCard variant="glass" delay={0.4}>
        <CardContent className="p-6">
          <div className="space-y-3">
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 pb-3 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400">
              <div>QUOTATION ID</div>
              <div>CUSTOMER</div>
              <div>DATE</div>
              <div>VALID UNTIL</div>
              <div>ITEMS</div>
              <div>AMOUNT</div>
              <div>STATUS</div>
            </div>

            {/* Table Rows */}
            {quotations.map((quotation) => (
              <Link key={quotation.name} href={`/quotations/${quotation.name}`}>
                <div className="grid grid-cols-7 gap-4 py-3 text-sm items-center hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors cursor-pointer">
                  <div className="font-medium text-blue-600 dark:text-blue-400">{quotation.name}</div>
                  <div className="text-slate-900 dark:text-white">{quotation.customer_name || quotation.party_name}</div>
                  <div className="text-slate-600 dark:text-slate-400">
                    {new Date(quotation.transaction_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    {new Date(quotation.valid_till).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">{quotation.total_qty || 0} items</div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {quotation.currency} {quotation.grand_total.toLocaleString()}
                  </div>
                  <div>
                    <Badge
                      variant="outline"
                      className={
                        quotation.status === "Draft"
                          ? "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                          : ["Sent", "Open"].includes(quotation.status)
                          ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                          : quotation.status === "Ordered"
                          ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      }
                    >
                      {quotation.status}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </AnimatedCard>
    </div>
  )
}
