"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Filter, TrendingUp, Wallet, Zap, User, Calendar, DollarSign, Package, ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { quotationAiInsight } from "@/lib/ai/document-insights"
import { validityLabel } from "@/lib/ai/quotation-insights"


interface Quotation {
  name: string
  quotation_to: string
  party_name: string
  customer_name?: string
  status: string
  valid_till: string
  grand_total: number
  currency: string
  transaction_date?: string
  total_qty?: number
  contact_email?: string
}

interface Opportunity {
  name: string
  opportunity_from: string
  party_name: string
  customer_name?: string
  opportunity_type: string
  status: string
  sales_stage: string
  expected_closing: string
  probability: number
  opportunity_amount: number
  currency: string
}

interface QuotationsClientProps {
  quotations: Quotation[]
  opportunities: Opportunity[]
}

const STATUS_TABS = [
  { name: "All Quotations", filter: "all" },
  { name: "Ready for Quotation", filter: "ready" }
] as const

export function QuotationsClient({ quotations, opportunities }: QuotationsClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTab, setSelectedTab] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("last30")
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 5

  // Calculate KPIs
  const totalQuotations = quotations.length
  const openQuotations = quotations.filter(q => ['Open', 'Sent'].includes(q.status)).length
  const totalValue = quotations.reduce((sum, q) => sum + (q.grand_total || 0), 0)

  // Filtered quotations
  const filteredQuotations = useMemo(() => {
    let result = quotations

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(q =>
        q.name.toLowerCase().includes(query) ||
        (q.customer_name || q.party_name || "").toLowerCase().includes(query) ||
        (q.contact_email || "").toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(q => q.status.toLowerCase() === statusFilter.toLowerCase())
    }

    // Tab filter
    if (selectedTab === "ready") {
      result = result.filter(q => q.status === 'Draft')
    }

    return result
  }, [quotations, searchQuery, statusFilter, selectedTab])

  // Pagination
  const totalPages = Math.ceil(filteredQuotations.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedQuotations = filteredQuotations.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    queueMicrotask(() => {
      setCurrentPage(1)
    })
  }, [searchQuery, statusFilter, selectedTab])

  // Helper: Get status badge styling
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Draft': 'bg-slate-100 dark:bg-slate-700 text-slate-700 ',
      'Open': 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 border border-blue-100 dark:border-blue-900',
      'Sent': 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 border border-blue-100 dark:border-blue-900',
      'Cancelled': 'bg-slate-100 dark:bg-slate-800 text-muted-foreground border border-slate-200 dark:border-slate-700',
      'Ordered': 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-200 border border-green-100 dark:border-green-900'
    }
    return styles[status] || 'bg-slate-100 dark:bg-slate-700 text-slate-700 '
  }

  // Helper: Get AI insight badge
  const getAIInsight = quotationAiInsight

  // Helper: Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`
    }
    return `₹${amount.toLocaleString('en-IN')}`
  }

  // Helper: Calculate days remaining (local date — avoids UTC false "Expired")
  const getDaysRemaining = (validTill: string) => validityLabel(validTill)

  // Find opportunities in Proposal/Price Quote stage, Open status, and no draft quotation exists
  const draftQuotations = quotations.filter(q => q.status === 'Draft')
  const proposalOpportunities = opportunities.filter(
    opp => opp.sales_stage === 'Proposal/Price Quote' && opp.status === 'Open'
  )

  // Only use combined array for ready tab, otherwise just show quotations
  const readyQuotationsAndOpportunities = useMemo(() => {
    if (selectedTab !== "ready") return paginatedQuotations.map(q => ({ type: "quotation" as const, data: q }));
    // Combine paginated draft quotations and proposal opportunities (no deduplication by opportunity possible)
    return [
      ...paginatedQuotations.map(q => ({ type: "quotation" as const, data: q })),
      ...proposalOpportunities.map(o => ({ type: "opportunity" as const, data: o }))
    ];
  }, [selectedTab, paginatedQuotations, proposalOpportunities])

  return (
    <div className="app-shell">
      {/* Header */}
      <PageHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search quotations, customers or ask AI..."
      />

      <main className="app-content flex-1 space-y-8 w-full">
        <div className="app-container">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[13px] font-medium text-muted-foreground">Total Quotations</p>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-2xl font-medium text-foreground leading-none">{totalQuotations}</p>
            </div>
            <div className="mt-3 text-[11px] font-medium text-muted-foreground">
              {openQuotations} open · {formatCurrency(totalValue)} pipeline
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${totalQuotations > 0 ? Math.min(100, (openQuotations / totalQuotations) * 100) : 0}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[13px] font-medium text-muted-foreground">Open Quotations</p>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-2xl font-medium text-foreground leading-none">{openQuotations}</p>
              <span className="text-sm font-semibold text-slate-400 mb-1">Target: 10</span>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.min(100, (openQuotations / 10) * 100)}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[13px] font-medium text-muted-foreground">Total Value</p>
              <div className="p-2 rounded-lg bg-yellow-400/10 text-yellow-400">
                <Zap className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-2xl font-medium text-foreground leading-none">{formatCurrency(totalValue)}</p>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-yellow-400 w-full rounded-full" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-none overflow-hidden">
          <div className="border-b border-border p-6">
            <div className="mb-6 flex items-center gap-8 border-b border-border pb-4">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.filter}
                  onClick={() => setSelectedTab(tab.filter)}
                  className={`pb-3 text-sm font-semibold transition-all ${selectedTab === tab.filter
                      ? 'border-b-2 border-primary text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {tab.name} ({tab.filter === "all" ? quotations.length : draftQuotations.length + proposalOpportunities.length})
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-10 w-full pl-10 bg-background border-border/60 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Search by ID, customer name, or item..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="open">Open</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="last30">Last 30 Days</option>
                  <option value="thisMonth">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
                <Button variant="outline" className="h-10">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-base font-semibold text-foreground">Active Quotations</h3>
                <p className="mt-1 text-sm text-muted-foreground">Showing {filteredQuotations.length} results</p>
              </div>
            </div>
            {readyQuotationsAndOpportunities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No quotations found
              </div>
            ) : (
              readyQuotationsAndOpportunities.map((item) => {
                if (item.type === "quotation") {
                  const quotation = item.data;
                  const aiInsight = getAIInsight(quotation);
                  const daysRemaining = getDaysRemaining(quotation.valid_till);
                  return (
                    <div
                      key={quotation.name}
                      className="group relative cursor-pointer rounded-xl border border-border bg-card p-6 transition-colors hover:bg-muted/30"
                      onClick={() => router.push(`/crm/quotations/${quotation.name}`)}
                    >
                      <div className="absolute right-4 top-4 flex items-center gap-2">
                        {aiInsight && (
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${aiInsight.color}`}>
                            {aiInsight.text}
                          </span>
                        )}
                        {selectedTab === "ready" && (
                          <Link href={`/crm/quotations/new?from=${quotation.name}`}>
                            <Button size="sm" onClick={(e) => e.stopPropagation()}>
                              Create Quotation
                            </Button>
                          </Link>
                        )}
                      </div>

                      <div className="mb-4 flex flex-wrap items-center gap-3 pr-32">
                        <h4 className="text-base font-semibold text-foreground">{quotation.name}</h4>
                        <span className={`rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase ${getStatusBadge(quotation.status)}`}>
                          {quotation.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Customer</p>
                          <p className="text-sm font-semibold text-foreground">{quotation.customer_name || quotation.party_name}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Valid till</p>
                          <p className="text-sm font-semibold text-foreground">
                            {new Date(quotation.valid_till).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <p className={`text-xs font-medium ${daysRemaining.color}`}>{daysRemaining.text}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Amount</p>
                          <p className="text-sm font-bold text-foreground">{formatCurrency(quotation.grand_total)}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Items</p>
                          <p className="text-sm font-semibold text-foreground">{quotation.total_qty || 0} SKUs</p>
                        </div>
                      </div>
                    </div>
                  );
                } else if (item.type === "opportunity") {
                  const opp = item.data;
                  return (
                    <div
                      key={opp.name}
                      className="relative rounded-xl border border-border bg-card p-6"
                    >
                      <div className="absolute right-4 top-4">
                        <Link href={`/crm/quotations/new?opportunity=${opp.name}`}>
                          <Button size="sm">Create Quotation</Button>
                        </Link>
                      </div>
                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        <h4 className="text-base font-semibold text-foreground">{opp.name}</h4>
                        <span className="rounded-md border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                          Proposal/Price Quote
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                          <p className="mb-1 text-[11px] font-medium uppercase text-muted-foreground">Customer</p>
                          <p className="text-sm font-semibold">{opp.customer_name || opp.party_name}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-[11px] font-medium uppercase text-muted-foreground">Expected close</p>
                          <p className="text-sm font-semibold">{new Date(opp.expected_closing).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-[11px] font-medium uppercase text-muted-foreground">Amount</p>
                          <p className="text-sm font-bold">{formatCurrency(opp.opportunity_amount)}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-[11px] font-medium uppercase text-muted-foreground">Probability</p>
                          <p className="text-sm font-semibold">{opp.probability}%</p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 py-6 border-t border-border/40 dark:border-slate-800 mt-6">
                <div className="text-sm text-slate-600 ">
                  Showing <span className="font-semibold text-slate-900 dark:text-white">{startIndex + 1}</span> to <span className="font-semibold text-slate-900 dark:text-white">{Math.min(endIndex, filteredQuotations.length)}</span> of <span className="font-semibold text-slate-900 dark:text-white">{filteredQuotations.length}</span> quotations
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-slate-700  bg-card dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${currentPage === pageNum
                              ? "bg-blue-600 text-white"
                              : "text-slate-700  bg-card dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-slate-700  bg-card dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}
