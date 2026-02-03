"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Filter, TrendingUp, Wallet, Zap, User, Calendar, DollarSign, Package, ArrowRight } from "lucide-react"


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
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, selectedTab])

  // Helper: Get status badge styling
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Draft': 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200',
      'Open': 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 border border-blue-100 dark:border-blue-900',
      'Sent': 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 border border-blue-100 dark:border-blue-900',
      'Cancelled': 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700',
      'Ordered': 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-200 border border-green-100 dark:border-green-900'
    }
    return styles[status] || 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
  }

  // Helper: Get AI insight badge
  const getAIInsight = (quotation: Quotation) => {
    if (quotation.status === 'Draft') {
      return {
        text: 'Follow-up Recommended',
        color: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800'
      }
    } else if (quotation.status === 'Open' && quotation.grand_total > 25000) {
      return {
        text: 'High Win Probability',
        color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
      }
    }
    return null
  }

  // Helper: Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`
    }
    return `₹${amount.toLocaleString('en-IN')}`
  }

  // Helper: Calculate days remaining
  const getDaysRemaining = (validTill: string) => {
    const today = new Date()
    const validDate = new Date(validTill)
    const diffTime = validDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return { text: 'Expired', color: 'text-red-500' }
    } else if (diffDays < 7) {
      return { text: `${diffDays} days remaining`, color: 'text-orange-500' }
    }
    return { text: `${diffDays} days remaining`, color: 'text-slate-400' }
  }

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
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      {/* Header */}
      <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-10 shrink-0 sticky top-0 z-40">
        <div className="flex-1 flex items-center">
          <div className="max-w-xl w-full relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-full pl-12 pr-5 py-2.5 text-[15px] focus:ring-2 focus:ring-blue-600 placeholder-slate-400 text-slate-600 dark:text-slate-300"
              placeholder="Search quotations, customers or ask AI..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-6 ml-10">
          <div className="flex items-center gap-4 pl-6 border-l border-slate-200 dark:border-slate-800">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Alex Thompson</p>
              <p className="text-xs text-slate-500 mt-0.5">Sales Admin</p>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-blue-600/20 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-sm font-bold">
              AT
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-10 space-y-10 w-full">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Total Quotations</p>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-[28px] font-bold text-white leading-none">{totalQuotations}</p>
              <span className="text-sm font-semibold text-blue-400 mb-1">+12%</span>
            </div>
            <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[72%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
            </div>
          </div>

          <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Open Quotations</p>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-[28px] font-bold text-white leading-none">{openQuotations}</p>
              <span className="text-sm font-semibold text-slate-400 mb-1">Target: 10</span>
            </div>
            <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[50%] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
            </div>
          </div>

          <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Total Value</p>
              <div className="p-2 rounded-lg bg-yellow-400/10 text-yellow-400">
                <Zap className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-[28px] font-bold text-white leading-none">{formatCurrency(totalValue)}</p>
            </div>
            <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 w-[85%] rounded-full shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 dark:border-slate-700">
            {/* Tabs */}
            <div className="flex items-center gap-10 mb-8 border-b border-slate-100 dark:border-slate-700">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.filter}
                  onClick={() => setSelectedTab(tab.filter)}
                  className={`text-[16px] font-bold pb-4 transition-all ${
                    selectedTab === tab.filter
                      ? 'text-slate-900 dark:text-white border-b-4 border-blue-600'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
                  }`}
                >
                  {tab.name} ({tab.filter === "all" ? filteredQuotations.length : quotations.filter(q => q.status === 'Draft').length})
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-6">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 shadow-sm"
                  placeholder="Search by ID, customer name, or item..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <select
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm py-3 px-4 pr-10 focus:ring-blue-600 shadow-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="open">Open</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm py-3 px-4 pr-10 focus:ring-blue-600 shadow-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="last30">Date Range: Last 30 Days</option>
                  <option value="thisMonth">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
                <button className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <Filter className="h-4 w-4" />
                  More Filters
                </button>
              </div>
            </div>
          </div>

          {/* Quotations List */}
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-center mb-2 px-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Quotations</h3>
                <p className="text-[14px] text-slate-500 mt-1">Showing {filteredQuotations.length} results from all channels</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-400 font-medium bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full uppercase tracking-widest">Last synced: 2m ago</span>
              </div>
            </div>

            {/* Quotation Cards */}
            {readyQuotationsAndOpportunities.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
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
                      className="group border border-slate-200 dark:border-slate-700 rounded-2xl p-10 hover:border-blue-600/50 hover:shadow-xl transition-all bg-white dark:bg-slate-800/50 relative cursor-pointer"
                      onClick={() => router.push(`/crm/quotations/${quotation.name}`)}
                    >
                      <div className="absolute top-10 right-10 flex items-center gap-4">
                        {aiInsight && (
                          <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase flex items-center gap-2 ${aiInsight.color}`}>
                            <Zap className="h-3.5 w-3.5" /> {aiInsight.text}
                          </span>
                        )}
                        <Link href={`/crm/quotations/new?from=${quotation.name}`}>
                          <button 
                            className="text-xs font-bold uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 border border-blue-600 rounded-lg px-6 py-3 transition-colors flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Create Quotation <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </Link>
                      </div>

                      <div className="flex items-center gap-4 mb-10">
                        <h4 className="text-[20px] font-bold text-slate-900 dark:text-white tracking-tight">{quotation.name}</h4>
                        <span className={`text-[11px] px-3 py-1 rounded-md font-bold uppercase tracking-widest ${getStatusBadge(quotation.status)}`}>
                          {quotation.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-16">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                            <User className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-[12px] font-bold uppercase tracking-widest text-slate-500 mb-1">Customer</p>
                            <p className="text-[18px] font-semibold text-slate-900 dark:text-white leading-tight">{quotation.customer_name || quotation.party_name}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                            <Calendar className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-[12px] font-bold uppercase tracking-widest text-slate-500 mb-1">Valid till</p>
                            <p className="text-[18px] font-semibold text-slate-900 dark:text-white leading-tight">
                              {new Date(quotation.valid_till).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className={`text-sm font-medium ${daysRemaining.color}`}>{daysRemaining.text}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                            <DollarSign className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-[12px] font-bold uppercase tracking-widest text-slate-500 mb-1">Amount</p>
                            <p className="text-[20px] font-bold text-slate-900 dark:text-white leading-tight">{formatCurrency(quotation.grand_total)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-[12px] font-bold uppercase tracking-widest text-slate-500 mb-1">Items</p>
                            <p className="text-[18px] font-semibold text-slate-900 dark:text-white leading-tight">{quotation.total_qty || 0} SKUs</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else if (item.type === "opportunity") {
                  const opp = item.data;
                  return (
                    <div
                      key={opp.name}
                      className="group border border-slate-200 dark:border-slate-700 rounded-2xl p-10 hover:border-blue-600/50 hover:shadow-xl transition-all bg-white dark:bg-slate-800/50 relative"
                    >
                      <div className="absolute top-10 right-10 flex items-center gap-4">
                        <Link href={`/crm/quotations/new?opportunity=${opp.name}`}>
                          <button 
                            className="text-xs font-bold uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 border border-blue-600 rounded-lg px-6 py-3 transition-colors flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Create Quotation <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </Link>
                      </div>
                      <div className="flex items-center gap-4 mb-10">
                        <h4 className="text-[20px] font-bold text-slate-900 dark:text-white tracking-tight">{opp.name}</h4>
                        <span className="text-[11px] px-3 py-1 rounded-md font-bold uppercase tracking-widest bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border border-blue-100 dark:border-blue-900">
                          Proposal/Price Quote
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-16">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                            <User className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-[12px] font-bold uppercase tracking-widest text-slate-500 mb-1">Customer</p>
                            <p className="text-[18px] font-semibold text-slate-900 dark:text-white leading-tight">{opp.customer_name || opp.party_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                            <Calendar className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-[12px] font-bold uppercase tracking-widest text-slate-500 mb-1">Expected Closing</p>
                            <p className="text-[18px] font-semibold text-slate-900 dark:text-white leading-tight">{new Date(opp.expected_closing).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                            <DollarSign className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-[12px] font-bold uppercase tracking-widest text-slate-500 mb-1">Amount</p>
                            <p className="text-[20px] font-bold text-slate-900 dark:text-white leading-tight">{formatCurrency(opp.opportunity_amount)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-[12px] font-bold uppercase tracking-widest text-slate-500 mb-1">Stage</p>
                            <p className="text-[18px] font-semibold text-slate-900 dark:text-white leading-tight">Proposal/Price Quote</p>
                          </div>
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
              <div className="flex items-center justify-between px-2 py-6 border-t border-slate-200 dark:border-slate-800 mt-6">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Showing <span className="font-semibold text-slate-900 dark:text-white">{startIndex + 1}</span> to <span className="font-semibold text-slate-900 dark:text-white">{Math.min(endIndex, filteredQuotations.length)}</span> of <span className="font-semibold text-slate-900 dark:text-white">{filteredQuotations.length}</span> quotations
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === pageNum
                              ? "bg-blue-600 text-white"
                              : "text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
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
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
