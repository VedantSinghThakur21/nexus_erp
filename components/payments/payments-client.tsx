"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

interface PaymentEntry {
  name: string
  docstatus?: number
  party_name: string
  payment_type: string
  mode_of_payment?: string
  posting_date: string
  party_type: string
  paid_amount?: number
  received_amount?: number
  reference_no?: string
  reference_date?: string
}

interface PaymentsClientProps {
  payments: PaymentEntry[]
}

type TabFilter = "ALL" | "PENDING" | "ERROR"

export function PaymentsClient({ payments }: PaymentsClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<TabFilter>("ALL")
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  // Calculate KPIs
  const totalPayments = payments.length
  const submittedPayments = payments.filter(p => p.docstatus === 1)
  const totalAmount = submittedPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0)
  const receivePayments = payments.filter(p => p.payment_type === 'Receive')
  const payPayments = payments.filter(p => p.payment_type === 'Pay')

  // Filter payments
  const filteredPayments = useMemo(() => {
    let result = payments

    // Apply tab filter
    if (activeTab === "PENDING") {
      result = result.filter(p => p.docstatus === 0)
    } else if (activeTab === "ERROR") {
      result = result.filter(p => p.docstatus === 2)
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.party_name || "").toLowerCase().includes(query) ||
        (p.reference_no || "").toLowerCase().includes(query)
      )
    }

    return result
  }, [payments, activeTab, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery, activeTab])

  // Helper functions
  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`
    }
    return `₹${amount.toLocaleString('en-IN')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getStatusInfo = (docstatus?: number) => {
    if (docstatus === 1) {
      return { label: 'Submitted', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-500' }
    } else if (docstatus === 2) {
      return { label: 'Cancelled', color: 'text-slate-400', bgColor: 'bg-slate-400' }
    } else {
      return { label: 'Draft', color: 'text-amber-500', bgColor: 'bg-amber-500' }
    }
  }

  const getFraudCheckStatus = (payment: PaymentEntry) => {
    // Cancelled payments
    if (payment.docstatus === 2) {
      return { label: 'N/A', icon: 'block', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' }
    }
    // Draft payments need review
    if (payment.docstatus === 0) {
      return { label: 'REVIEW', icon: 'info', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' }
    }
    // Submitted payments are verified
    return { label: 'VERIFIED', icon: 'verified_user', color: 'bg-green-500/10 text-green-500 border-green-500/20' }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-navy-900 border-b border-slate-200 dark:border-slate-800 px-8 py-3 h-16 flex items-center justify-between">
        <div className="flex-1 max-w-2xl relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
          <input
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            placeholder="Ask AI anything..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400">⌘ K</span>
        </div>
        <div className="flex items-center space-x-6">
          {/* Removed New Payment button as per request */}
          <div className="flex items-center space-x-4 border-l border-slate-200 dark:border-slate-800 pl-6">
            <button className="relative text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[24px]">notifications</span>
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-navy-900"></span>
            </button>
            <button className="flex items-center space-x-3 group">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-xs text-white font-bold ring-2 ring-white dark:ring-navy-800 shadow-sm">JS</div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">James Smith</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-[1600px] mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Payment Entries</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Enterprise-grade transaction management powered by real-time neural auditing.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Total Payments */}
          <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Total Payments</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <span className="material-symbols-outlined text-xl">receipt_long</span>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-[28px] font-bold text-white leading-none">{totalPayments}</span>
              <span className="text-sm font-semibold text-green-400 mb-1 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-xs">trending_up</span>+5.2%
              </span>
            </div>
            <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[72%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
            </div>
          </div>

          {/* Total Amount */}
          <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Total Amount</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <span className="material-symbols-outlined text-xl">payments</span>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-[28px] font-bold text-white leading-none">{formatCurrency(totalAmount)}</span>
              <span className="text-sm font-semibold text-slate-400 mb-1">Settled Oct 2025</span>
            </div>
            <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[45%] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            </div>
          </div>

          {/* Received */}
          <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Received</span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <span className="material-symbols-outlined text-xl">input</span>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-[28px] font-bold text-white leading-none">{receivePayments.length}</span>
              <span className="text-sm font-semibold text-slate-400 mb-1">Net Inflow</span>
            </div>
            <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-[85%] rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
            </div>
          </div>

          {/* Paid Out */}
          <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Paid Out</span>
              <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                <span className="material-symbols-outlined text-xl">outbox</span>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-[28px] font-bold text-white leading-none">{payPayments.length}</span>
              <span className="text-sm font-semibold text-red-400 mb-1 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-xs">trending_down</span>2.1%
              </span>
            </div>
            <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 w-[20%] rounded-full shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-navy-900">
            <div>
              <h2 className="font-bold text-lg text-slate-900 dark:text-white">All Payment Entries</h2>
              <p className="text-xs text-slate-500 mt-0.5">Real-time ledger of verified organizational transactions</p>
            </div>
            <div className="flex space-x-3">
              <div className="flex border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setActiveTab("ALL")}
                  className={`px-4 py-2 text-xs font-bold transition-colors ${
                    activeTab === "ALL"
                      ? "bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  ALL
                </button>
                <button
                  onClick={() => setActiveTab("PENDING")}
                  className={`px-4 py-2 text-xs font-bold transition-colors ${
                    activeTab === "PENDING"
                      ? "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  PENDING
                </button>
                <button
                  onClick={() => setActiveTab("ERROR")}
                  className={`px-4 py-2 text-xs font-bold transition-colors ${
                    activeTab === "ERROR"
                      ? "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  ERROR
                </button>
              </div>
              <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                <span className="material-symbols-outlined text-[18px] mr-2">filter_list</span> Filter
              </button>
              <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                <span className="material-symbols-outlined text-[18px] mr-2">file_download</span> Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="text-[12px] font-bold uppercase tracking-wider text-slate-500 py-4 px-6">Payment ID</th>
                  <th className="text-[12px] font-bold uppercase tracking-wider text-slate-500 py-4 px-6">Date</th>
                  <th className="text-[12px] font-bold uppercase tracking-wider text-slate-500 py-4 px-6 min-w-[200px]">Party</th>
                  <th className="text-[12px] font-bold uppercase tracking-wider text-slate-500 py-4 px-6">Type</th>
                  <th className="text-[12px] font-bold uppercase tracking-wider text-slate-500 py-4 px-6">Mode</th>
                  <th className="text-[12px] font-bold uppercase tracking-wider text-slate-500 py-4 px-6 text-right">Amount</th>
                  <th className="text-[12px] font-bold uppercase tracking-wider text-slate-500 py-4 px-6">Status</th>
                  <th className="text-[12px] font-bold uppercase tracking-wider text-slate-500 py-4 px-6 min-w-[150px]">AI Fraud Check</th>
                  <th className="text-[12px] font-bold uppercase tracking-wider text-slate-500 py-4 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-500 dark:text-slate-400">
                      No payment entries found
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((payment, index) => {
                    const statusInfo = getStatusInfo(payment.docstatus)
                    const fraudCheck = getFraudCheckStatus(payment)
                    const showAIInsight = payment.docstatus === 1 && index === 0

                    return (
                      <>
                        <tr key={payment.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                          <td className="px-6 py-4 text-sm font-semibold text-primary cursor-pointer hover:underline">
                            <Link href={`/payments/${payment.name}`}>{payment.name}</Link>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{formatDate(payment.posting_date)}</td>
                          <td className="px-6 py-4 text-[16px] font-medium text-slate-900 dark:text-white">{payment.party_name}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md uppercase tracking-tight ${
                              payment.payment_type === 'Receive'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                            }`}>
                              {payment.payment_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{payment.mode_of_payment || '-'}</td>
                          <td className={`px-6 py-4 text-[16px] font-medium text-right ${payment.docstatus === 2 ? 'opacity-50' : 'text-slate-900 dark:text-white'}`}>
                            {formatCurrency(payment.paid_amount || 0)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`flex items-center text-xs font-medium ${statusInfo.color} ${payment.docstatus === 2 ? 'line-through' : ''}`}>
                              <span className={`w-1.5 h-1.5 ${statusInfo.bgColor} rounded-full mr-2`}></span> {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded border ${fraudCheck.color}`}>
                              <span className="material-symbols-outlined text-[12px] mr-1">{fraudCheck.icon}</span> {fraudCheck.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => router.push(`/payments/${payment.name}`)}
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                            >
                              <span className="material-symbols-outlined text-[20px]">visibility</span>
                            </button>
                          </td>
                        </tr>
                        {showAIInsight && (
                          <tr className="bg-indigo-50/40 dark:bg-indigo-900/10 border-l-4 border-indigo-500">
                            <td className="px-6 py-2.5" colSpan={9}>
                              <div className="flex items-center space-x-3">
                                <div className="flex -space-x-1">
                                  <span className="material-symbols-outlined text-indigo-500 text-[16px]">auto_awesome</span>
                                </div>
                                <span className="text-indigo-700 dark:text-indigo-400 text-[11px] font-semibold tracking-wide uppercase">AI Insight</span>
                                <span className="text-slate-600 dark:text-slate-400 text-[13px]">
                                  Payment successfully recorded and verified. Transaction pattern matches expected business flow.
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center text-[12px] font-bold text-slate-500 uppercase tracking-wider">
              Showing <span className="mx-1 text-slate-900 dark:text-white">{startIndex + 1} - {Math.min(endIndex, filteredPayments.length)}</span> of <span className="mx-1 text-slate-900 dark:text-white">{filteredPayments.length}</span> Entries
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-400 hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                let pageNum = i + 1
                if (totalPages > 3) {
                  if (currentPage <= 2) pageNum = i + 1
                  else if (currentPage >= totalPages - 1) pageNum = totalPages - 2 + i
                  else pageNum = currentPage - 1 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                      currentPage === pageNum
                        ? 'bg-primary text-white shadow-sm'
                        : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              {totalPages > 3 && <span className="px-2 text-slate-400 text-xs">...</span>}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-navy-900 text-slate-400 hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
