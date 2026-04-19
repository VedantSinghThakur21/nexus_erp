"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Filter, Download, CheckCircle, Calendar, Receipt } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

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
      'Paid': 'bg-emerald-100 text-emerald-700',
      'Unpaid': 'bg-amber-100 text-amber-700',
      'Sent': 'bg-blue-100 text-blue-700',
      'Draft': 'bg-muted text-muted-foreground',
      'Cancelled': 'bg-muted text-muted-foreground',
      'Overdue': 'bg-red-100 text-red-700'
    }
    return styles[status] || 'bg-muted text-muted-foreground'
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
    <div className="app-shell">
      <PageHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Ask AI anything about your collections..."
      />

      <main className="app-content mx-auto max-w-[1600px] space-y-6">
        <div className="border-b border-border pb-6">
          <h1 className="text-xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">Manage billing and collection intelligence across your enterprise.</p>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-medium text-muted-foreground">Total Invoices</span>
              <Receipt className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-2xl font-medium text-foreground">{totalInvoices}</div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
              <span className="text-sm">↗</span> +12% from last month
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-medium text-muted-foreground">Pending</span>
              <span className="text-amber-600">⏱</span>
            </div>
            <div className="text-2xl font-medium text-foreground">{pendingInvoices}</div>
            <div className="mt-3 text-[11px] font-medium text-muted-foreground">Waiting for approval</div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-medium text-muted-foreground">Overdue</span>
              <span className="text-red-600">⚠</span>
            </div>
            <div className="text-2xl font-medium text-foreground">{overdueInvoices}</div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-red-600">
              <span className="text-sm">⚡</span> High risk identified
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-medium text-muted-foreground">Total Collected</span>
              <span className="text-emerald-600">💰</span>
            </div>
            <div className="text-2xl font-medium text-foreground">{formatCurrency(totalCollected)}</div>
            <div className="mt-3 text-[11px] font-medium text-muted-foreground">Current fiscal year</div>
          </div>
        </section>

        {readyForInvoice && readyForInvoice.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-4 w-4 text-blue-600" />
              </div>
              <h2 className="text-base font-medium">Ready for Invoice</h2>
              <span className="ml-2 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                {readyForInvoice.length} SALES ORDER{readyForInvoice.length > 1 ? 'S' : ''}
              </span>
            </div>

            <div className="space-y-4">
              {readyForInvoice.map((order) => (
                <div key={order.name} className="flex flex-col items-start justify-between gap-4 rounded-xl border border-border bg-muted/20 p-5 lg:flex-row lg:items-center">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-base font-medium text-foreground">{order.name}</span>
                      <span className="rounded border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {order.status}
                      </span>
                      {order.delivery_status && (
                        <span className="rounded border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                          {order.delivery_status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{order.customer_name || order.customer}</p>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" /> {formatDate(order.transaction_date)}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        {formatCurrency(order.grand_total, order.currency)}
                      </span>
                    </div>
                  </div>
                  <Link href={`/invoices/new?sales_order=${encodeURIComponent(order.name)}`}>
                    <Button className="h-9 px-4">Create Invoice</Button>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-medium">All Invoices</h2>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 w-full pl-9 md:w-72 bg-background border-border/60 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Search invoices..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedInvoices.map((invoice) => {
              const aiInsight = getAIInsight(invoice)
              const daysOverdue = getDaysOverdue(invoice.due_date, invoice.status)

              return (
                <div
                  key={invoice.name}
                  className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/30"
                  onClick={() => router.push(`/invoices/${invoice.name}`)}
                >
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button className="rounded-md bg-muted p-2 transition-colors hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                      <Download className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-muted-foreground" />
                      <a className="text-sm font-medium text-primary hover:underline" href={`/invoices/${invoice.name}`} onClick={(e) => e.stopPropagation()}>
                        {invoice.name}
                      </a>
                    </div>
                    <Badge className={`rounded-md px-3 py-1 text-[10px] font-medium uppercase tracking-wide ${getStatusBadge(invoice.status)}`}>
                      {daysOverdue ? 'Overdue' : invoice.status}
                    </Badge>
                  </div>

                  <div className="mb-6">
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Customer</p>
                    <p className="text-base font-medium text-foreground">{invoice.customer_name}</p>
                  </div>

                  <div className="flex items-end justify-between border-t border-border pt-4">
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Amount</p>
                      <p className="text-xl font-medium text-foreground">{formatCurrency(invoice.grand_total, invoice.currency)}</p>
                      {daysOverdue ? (
                        <p className="mt-1 text-[11px] font-medium uppercase tracking-tight text-red-600">Overdue by {daysOverdue} days</p>
                      ) : (
                        <p className="mt-1 text-[11px] font-medium uppercase text-muted-foreground">
                          Due: {formatDate(invoice.due_date)}
                        </p>
                      )}
                    </div>
                    {aiInsight && (
                      <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-medium ${aiInsight.color}`}>
                        <span className="text-xs">{aiInsight.icon === 'verified' ? '✓' : '!'}</span> {aiInsight.label}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-9 rounded-md border border-border px-4 text-sm text-muted-foreground disabled:opacity-50"
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
                      className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium ${currentPage === pageNum
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted'
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
                className="h-9 rounded-md border border-border px-4 text-sm text-foreground hover:bg-muted/50 disabled:opacity-50"
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
