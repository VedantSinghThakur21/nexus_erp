"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { AIFraudCheck } from "@/components/payments/ai-fraud-check"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
    <div className="app-shell flex flex-col">
      {/* Header */}
      <PageHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="app-content mx-auto w-full max-w-[1600px] space-y-6">
        <div className="border-b border-border pb-6">
          <h1 className="text-xl font-semibold text-foreground">Payment Entries</h1>
          <p className="text-sm text-muted-foreground mt-1">Enterprise-grade transaction management with real-time checks.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Payments */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[13px] font-medium text-muted-foreground">Total Payments</span>
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <span className="material-symbols-outlined text-xl">receipt_long</span>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-2xl font-medium text-foreground leading-none">{totalPayments}</span>
              <span className="text-sm font-medium text-emerald-600 mb-1 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-xs">trending_up</span>+5.2%
              </span>
            </div>
            <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[72%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
            </div>
          </div>

          {/* Total Amount */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[13px] font-medium text-muted-foreground">Total Amount</span>
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <span className="material-symbols-outlined text-xl">payments</span>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-2xl font-medium text-foreground leading-none">{formatCurrency(totalAmount)}</span>
              <span className="text-sm font-medium text-muted-foreground mb-1">Settled Oct 2025</span>
            </div>
            <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[45%] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            </div>
          </div>

          {/* Received */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[13px] font-medium text-muted-foreground">Received</span>
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                <span className="material-symbols-outlined text-xl">input</span>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-2xl font-medium text-foreground leading-none">{receivePayments.length}</span>
              <span className="text-sm font-medium text-muted-foreground mb-1">Net Inflow</span>
            </div>
            <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-[85%] rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
            </div>
          </div>

          {/* Paid Out */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[13px] font-medium text-muted-foreground">Paid Out</span>
              <div className="p-2 rounded-lg bg-orange-100 text-orange-700">
                <span className="material-symbols-outlined text-xl">outbox</span>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-2xl font-medium text-foreground leading-none">{payPayments.length}</span>
              <span className="text-sm font-medium text-red-600 mb-1 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-xs">trending_down</span>2.1%
              </span>
            </div>
            <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 w-[20%] rounded-full shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-6">
            <div>
              <h2 className="text-base font-medium text-foreground">All Payment Entries</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Real-time ledger of verified organizational transactions</p>
            </div>
            <div className="flex space-x-3">
              <div className="flex overflow-hidden rounded-md border border-border">
                <button
                  onClick={() => setActiveTab("ALL")}
                  className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === "ALL"
                      ? "bg-muted border-r border-border text-foreground"
                      : "text-muted-foreground hover:bg-muted"
                    }`}
                >
                  ALL
                </button>
                <button
                  onClick={() => setActiveTab("PENDING")}
                  className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === "PENDING"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted"
                    }`}
                >
                  PENDING
                </button>
                <button
                  onClick={() => setActiveTab("ERROR")}
                  className={`px-4 py-2 text-xs font-bold transition-colors ${activeTab === "ERROR"
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted"
                    }`}
                >
                  ERROR
                </button>
              </div>
              <Button variant="outline" className="h-8 px-3 text-xs">
                <span className="material-symbols-outlined text-[18px] mr-2">filter_list</span> Filter
              </Button>
              <Button variant="outline" className="h-8 px-3 text-xs">
                <span className="material-symbols-outlined text-[18px] mr-2">file_download</span> Export
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-background border-y border-border">
                  <th className="text-xs font-medium uppercase tracking-wide text-muted-foreground py-4 px-6">Payment ID</th>
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
              <tbody className="divide-y divide-border">
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
                        <tr key={payment.name} className="hover:bg-muted/50 transition-colors group">
                          <td className="px-6 py-4 text-sm font-semibold text-primary cursor-pointer hover:underline">
                            <Link href={`/payments/${payment.name}`}>{payment.name}</Link>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(payment.posting_date)}</td>
                          <td className="px-6 py-4 text-[16px] font-medium text-foreground">{payment.party_name}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md uppercase tracking-tight ${payment.payment_type === 'Receive'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                              }`}>
                              {payment.payment_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{payment.mode_of_payment || '-'}</td>
                          <td className={`px-6 py-4 text-[16px] font-medium text-right ${payment.docstatus === 2 ? 'opacity-50' : 'text-foreground'}`}>
                            {formatCurrency(payment.paid_amount || 0)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`flex items-center text-xs font-medium ${statusInfo.color} ${payment.docstatus === 2 ? 'line-through' : ''}`}>
                              <span className={`w-1.5 h-1.5 ${statusInfo.bgColor} rounded-full mr-2`}></span> {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <AIFraudCheck payment={payment} />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => router.push(`/payments/${payment.name}`)}
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                            >
                              <span className="material-symbols-outlined text-[20px]">visibility</span>
                            </button>
                          </td>
                        </tr>
                        {showAIInsight && (
                          <tr className="bg-indigo-50/40 border-l-4 border-indigo-500">
                            <td className="px-6 py-2.5" colSpan={9}>
                              <div className="flex items-center space-x-3">
                                <div className="flex -space-x-1">
                                  <span className="material-symbols-outlined text-indigo-500 text-[16px]">auto_awesome</span>
                                </div>
                                <span className="text-indigo-700 text-[11px] font-semibold tracking-wide uppercase">AI Insight</span>
                                <span className="text-muted-foreground text-[13px]">
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
          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-6 py-4">
            <div className="flex items-center text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
              Showing <span className="mx-1 text-foreground">{startIndex + 1} - {Math.min(endIndex, filteredPayments.length)}</span> of <span className="mx-1 text-foreground">{filteredPayments.length}</span> Entries
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${currentPage === pageNum
                        ? 'bg-primary text-white shadow-sm'
                        : 'border border-border bg-background text-muted-foreground hover:bg-muted'
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
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
