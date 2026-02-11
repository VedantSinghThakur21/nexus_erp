"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Filter, Download, CheckCircle, Calendar, Receipt } from "lucide-react"
import { PageHeader } from "@/components/page-header"

interface Invoice {
  name: string
  customer_name: string
  grand_total: number
  status: string
  due_date: string
  currency: string
  docstatus?: number
}

interface SalesOrder {
  name: string
  customer: string
  customer_name?: string
  status: string
  delivery_status?: string
  grand_total: number
  currency: string
  transaction_date: string
  per_billed?: number
  per_delivered?: number
}

interface InvoicesClientProps {
  invoices: Invoice[]
  readyForInvoice: SalesOrder[]
}

export function InvoicesClient({ invoices, readyForInvoice }: InvoicesClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 8

  // Calculate KPIs
  const totalInvoices = invoices.length
  const pendingInvoices = invoices.filter(inv => inv.status === 'Draft' || inv.status === 'Unpaid').length
  const overdueInvoices = invoices.filter(inv => {
    if (!inv.due_date) return false
    return new Date(inv.due_date) < new Date() && inv.status !== 'Paid' && inv.status !== 'Cancelled'
  }).length
  const totalCollected = invoices
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, inv) => sum + (inv.grand_total || 0), 0)

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    let result = invoices

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(inv =>
        inv.name.toLowerCase().includes(query) ||
        (inv.customer_name || "").toLowerCase().includes(query)
      )
    }

    return result
  }, [invoices, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex)

  // Reset to page 1 when search changes
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Helper functions
  const formatCurrency = (amount: number, currency: string = 'INR') => {
    if (amount >= 100000) {
      return `${currency} ${(amount / 100000).toFixed(1)}L`
    }
    return `${currency} ${amount.toLocaleString('en-IN')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Paid': 'bg-slate-900 text-white dark:bg-slate-800',
      'Unpaid': 'bg-blue-100 text-blue-600',
      'Sent': 'bg-blue-100 text-blue-600',
      'Draft': 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
      'Cancelled': 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
      'Overdue': 'bg-red-100 text-red-600'
    }
    return styles[status] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
  }

  const getAIInsight = (invoice: Invoice) => {
    if (invoice.status === 'Paid') {
      return { label: 'LIKELY TO PAY', icon: 'verified', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800' }
    }
    if (invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status !== 'Paid') {
      return { label: 'HIGH RISK', icon: 'priority_high', color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800' }
    }
    if (invoice.status === 'Sent' && invoice.grand_total > 100000) {
      return { label: 'LIKELY TO PAY', icon: 'verified', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800' }
    }
    return null
  }

  const getDaysOverdue = (dueDate: string, status: string) => {
    if (status === 'Paid' || status === 'Cancelled') return null
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = today.getTime() - due.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays > 0) return diffDays
    return null
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#0F172A]">
      {/* Header */}
      <PageHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Ask AI anything about your collections..."
      />

      <main className="max-w-[1600px] mx-auto p-6 lg:p-10">
        {/* Page Title */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-1">Invoices</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage billing and collection intelligence across your enterprise.</p>
        </div>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-[#111827] p-7 rounded-2xl shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Total Invoices</span>
              <Receipt className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-white">{totalInvoices}</div>
            <div className="text-[10px] text-green-400 mt-3 flex items-center gap-1 font-medium">
              <span className="text-sm">↗</span> +12% from last month
            </div>
          </div>

          <div className="bg-[#111827] p-7 rounded-2xl shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Pending</span>
              <span className="text-orange-400">⏱</span>
            </div>
            <div className="text-3xl font-bold text-white">{pendingInvoices}</div>
            <div className="text-[10px] text-slate-400 mt-3 font-medium uppercase tracking-wider">Waiting for approval</div>
          </div>

          <div className="bg-[#111827] p-7 rounded-2xl shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Overdue</span>
              <span className="text-red-500">⚠</span>
            </div>
            <div className="text-3xl font-bold text-white">{overdueInvoices}</div>
            <div className="text-[10px] text-red-400 mt-3 flex items-center gap-1 font-medium">
              <span className="text-sm">⚡</span> HIGH RISK IDENTIFIED
            </div>
          </div>

          <div className="bg-[#111827] p-7 rounded-2xl shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">Total Collected</span>
              <span className="text-green-500">💰</span>
            </div>
            <div className="text-3xl font-bold text-white">{formatCurrency(totalCollected)}</div>
            <div className="text-[10px] text-slate-400 mt-3 font-medium uppercase tracking-wider">Current fiscal year</div>
          </div>
        </section>

        {/* Ready for Invoice Section */}
        {readyForInvoice && readyForInvoice.length > 0 && (
          <section className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 mb-10 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-blue-600" />
              </div>
              <h2 className="font-bold text-xl">Ready for Invoice</h2>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-2.5 py-1 rounded-full font-bold ml-2">
                {readyForInvoice.length} SALES ORDER{readyForInvoice.length > 1 ? 'S' : ''}
              </span>
            </div>

            <div className="space-y-4">
              {readyForInvoice.map((order) => (
                <div key={order.name} className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-bold text-lg text-slate-900 dark:text-white">{order.name}</span>
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] px-2.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-semibold">
                        {order.status}
                      </span>
                      {order.delivery_status && (
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[11px] px-2.5 py-0.5 rounded border border-green-200 dark:border-green-800 font-semibold">
                          {order.delivery_status}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">{order.customer_name || order.customer}</p>
                    <div className="flex items-center gap-6 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" /> {formatDate(order.transaction_date)}
                      </span>
                      <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        {formatCurrency(order.grand_total, order.currency)}
                      </span>
                    </div>
                  </div>
                  <Link href={`/invoices/new?sales_order=${encodeURIComponent(order.name)}`}>
                    <button className="bg-[#111827] dark:bg-white text-white dark:text-[#111827] px-8 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg">
                      Create Invoice
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Invoices Section */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold">All Invoices</h2>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  className="pl-10 pr-4 py-2.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none w-full md:w-72 focus:ring-1 focus:ring-blue-600 shadow-sm"
                  placeholder="Search invoices..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-5 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                <Filter className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Invoice Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedInvoices.map((invoice) => {
              const aiInsight = getAIInsight(invoice)
              const daysOverdue = getDaysOverdue(invoice.due_date, invoice.status)

              return (
                <div
                  key={invoice.name}
                  className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-7 hover:shadow-xl hover:border-blue-600/30 transition-all relative overflow-hidden group cursor-pointer"
                  onClick={() => router.push(`/invoices/${invoice.name}`)}
                >
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:text-blue-600 transition-colors shadow-sm" onClick={(e) => e.stopPropagation()}>
                      <Download className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-slate-400" />
                      <a className="font-bold text-blue-600 hover:underline text-sm" href={`/invoices/${invoice.name}`} onClick={(e) => e.stopPropagation()}>
                        {invoice.name}
                      </a>
                    </div>
                    <span className={`px-3 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider ${getStatusBadge(invoice.status)}`}>
                      {daysOverdue ? 'Overdue' : invoice.status}
                    </span>
                  </div>

                  <div className="mb-6">
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Customer</p>
                    <p className="font-bold text-slate-900 dark:text-white text-lg">{invoice.customer_name}</p>
                  </div>

                  <div className="flex items-end justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Amount</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(invoice.grand_total, invoice.currency)}</p>
                      {daysOverdue ? (
                        <p className="text-[11px] text-red-500 mt-1 uppercase tracking-tight font-bold">Overdue by {daysOverdue} days</p>
                      ) : (
                        <p className="text-[11px] text-slate-400 mt-1 uppercase font-medium">
                          Due: {formatDate(invoice.due_date)}
                        </p>
                      )}
                    </div>
                    {aiInsight && (
                      <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 ${aiInsight.color}`}>
                        <span className="text-xs">{aiInsight.icon === 'verified' ? '✓' : '!'}</span> {aiInsight.label}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-12">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl text-sm font-bold cursor-not-allowed transition-colors disabled:opacity-50"
              >
                Previous
              </button>
              <div className="flex gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1
                  if (totalPages > 5) {
                    if (currentPage <= 3) pageNum = i + 1
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                    else pageNum = currentPage - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold ${currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-5 py-2.5 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
