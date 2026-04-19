"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Filter, Package, CheckCircle, Clock, IndianRupee, Calendar, ArrowRight, Sparkles, TrendingUp, Truck } from "lucide-react"
import type { SalesOrder } from "@/app/actions/sales-orders"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface SalesOrdersClientProps {
  orders: SalesOrder[]
  readyQuotations: any[] // Using existing quotation type
  stats: {
    draft: number
    confirmed: number
    inProgress: number
    totalValue: number
  }
}

const STATUS_TABS = [
  { id: "all", label: "All Sales Orders" },
  { id: "ready", label: "Ready for Invoice" }
] as const

export function SalesOrdersClient({ orders, readyQuotations, stats }: SalesOrdersClientProps) {
  const [activeTab, setActiveTab] = useState<"all" | "ready">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filter orders based on search
  const filteredOrders = orders.filter(order => {
    const searchLower = searchQuery.toLowerCase()
    return (
      order.name.toLowerCase().includes(searchLower) ||
      order.customer?.toLowerCase().includes(searchLower) ||
      order.customer_name?.toLowerCase().includes(searchLower)
    )
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  // Helper functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getStatusColor = (status: string) => {
    if (status === "Draft") {
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
    }
    if (status === "Fully Delivered" || status === "Completed") {
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
    }
    if (["To Deliver and Bill", "To Bill", "To Deliver"].includes(status)) {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    }
    return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
  }

  const getDeliveryStatusColor = (status?: string) => {
    if (!status) return "text-slate-500 dark:text-slate-400"
    if (status === "Fully Delivered") return "text-emerald-600 dark:text-emerald-400"
    if (status === "Partly Delivered") return "text-amber-600 dark:text-amber-400"
    if (status === "Not Delivered") return "text-slate-500 dark:text-slate-400"
    return "text-slate-500 dark:text-slate-400"
  }

  const getAIRisk = (order: SalesOrder) => {
    // Mock AI risk assessment - replace with real logic
    if (order.per_delivered === 100) {
      return { label: "On Time", className: "text-emerald-700" }
    }
    if (order.per_delivered && order.per_delivered > 0) {
      return { label: "In Progress", className: "text-blue-700" }
    }
    return { label: "Delayed", className: "text-red-700" }
  }

  const getAIInsight = (order: SalesOrder) => {
    // Mock AI insights - replace with real logic
    if (order.per_delivered === 100 && order.per_billed !== 100) {
      return { label: "Ready to Bill", icon: Sparkles, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" }
    }
    if (order.status === "Draft") {
      return { label: "Expedite Shipping", icon: TrendingUp, color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" }
    }
    return { label: "On Track", icon: CheckCircle, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" }
  }

  return (
    <div className="app-shell flex flex-col overflow-x-hidden">
      {/* Header */}
      <PageHeader searchPlaceholder="Ask AI anything about your sales orders..." />

      <main className="app-content flex-1 w-full flex flex-col min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto w-full min-w-0">
          {/* Page Title */}
          <div className="mb-6 border-b border-border pb-6">
            <h1 className="text-xl font-semibold text-foreground">Sales Orders</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage enterprise sales orders and monitor fulfillment performance with AI-driven insights.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Draft */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[13px] font-medium text-muted-foreground">Draft</span>
                <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                  <Package className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-2xl font-medium text-foreground leading-none">{stats.draft}</span>
              </div>
              <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-muted-foreground/70 w-[20%] rounded-full"></div>
              </div>
            </div>

            {/* Confirmed */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[13px] font-medium text-muted-foreground">Confirmed</span>
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-2xl font-medium text-foreground leading-none">{stats.confirmed}</span>
              </div>
              <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[60%] rounded-full"></div>
              </div>
            </div>

            {/* In Progress */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[13px] font-medium text-muted-foreground">In Progress</span>
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-2xl font-medium text-foreground leading-none">{stats.inProgress}</span>
              </div>
              <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[35%] rounded-full"></div>
              </div>
            </div>

            {/* Total Value */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[13px] font-medium text-muted-foreground">Total Value</span>
                <div className="p-2 rounded-lg bg-violet-100 text-violet-700">
                  <IndianRupee className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-2xl font-medium text-foreground leading-none">₹{stats.totalValue.toLocaleString()}</span>
              </div>
              <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 w-[85%] rounded-full"></div>
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-col items-center justify-between gap-4 lg:flex-row">
            <div className="flex w-full rounded-lg border border-border bg-muted p-1 lg:w-auto">
              {STATUS_TABS.map((tab) => {
                const count = tab.id === "all" ? orders.length : readyQuotations.length
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setCurrentPage(1)
                    }}
                    className={`flex-1 rounded-md px-6 py-2 text-sm font-medium transition-colors lg:flex-none ${activeTab === tab.id
                      ? "bg-background text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {tab.label} ({count})
                  </button>
                )
              })}
            </div>

            <div className="flex w-full items-center space-x-3 lg:max-w-2xl">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                  <Search className="h-5 w-5" />
                </span>
                <Input
                  className="h-9 pl-10"
                  placeholder="Search by ID, customer, or items..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <Button variant="outline" className="h-9">
                <Filter className="h-5 w-5 mr-2" /> Filter
              </Button>
            </div>
          </div>

          {/* Content based on active tab */}
          {activeTab === "all" ? (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-border">
                  <thead className="sticky top-0 bg-background">
                    <tr>
                      <th className="h-12 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Order ID</th>
                      <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Order Date</th>
                      <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Items</th>
                      <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">AI Fulfillment Risk</th>
                      <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">AI Insight</th>
                      <th className="px-4 py-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-4 text-right text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {paginatedOrders.map((order) => {
                      const risk = getAIRisk(order)
                      const insight = getAIInsight(order)
                      const InsightIcon = insight.icon

                      return (
                        <tr key={order.name} className="group h-12 hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-primary">
                            <Link href={`/sales-orders/${order.name}`}>{order.name}</Link>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                            {order.customer_name || order.customer}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {formatDate(order.transaction_date)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {order.total_qty || 0} items
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                            {order.currency} {order.grand_total.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className={`flex items-center text-xs font-medium uppercase tracking-tight ${risk.className}`}>
                              <span className="mr-1.5 h-2 w-2 rounded-full bg-current"></span>
                              {risk.label}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Badge className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${insight.color}`}>
                              <InsightIcon className="h-3.5 w-3.5 mr-1" />
                              {insight.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`rounded-md px-2.5 py-1 text-[10px] font-medium uppercase ${getStatusColor(order.status)}`}>
                              {order.delivery_status || order.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <Link href={`/sales-orders/${order.name}`}>
                                <button className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">
                                  View
                                </button>
                              </Link>
                              <button className="flex items-center rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">
                                <Truck className="h-3.5 w-3.5 mr-1" />
                                Update
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-4">
                <span className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} entries
                </span>
                <div className="flex space-x-3">
                  <button
                    className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-50 font-medium"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Ready for Sales Order Tab
            <div className="rounded-xl border border-border bg-card p-6">
              {readyQuotations.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p className="font-medium text-lg mb-2">No quotations ready</p>
                  <p className="text-sm mt-2 mb-4">Submit a quotation to see it here</p>
                  <Link href="/crm/quotations">
                    <Button className="h-9 px-4">
                      Go to Quotations
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {readyQuotations.map((quotation) => (
                    <div
                      key={quotation.name}
                      className="rounded-xl border border-border bg-emerald-50/40 p-5 transition-colors hover:bg-emerald-50/60"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                              {quotation.name}
                            </h3>
                            <span className="px-3 py-1 text-xs font-bold uppercase rounded-md bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Ready
                            </span>
                          </div>

                          <div className="grid md:grid-cols-3 gap-4 text-sm mb-4">
                            <div>
                              <span className="text-slate-500">Customer: </span>
                              <span className="font-medium text-slate-900 dark:text-white">
                                {quotation.customer_name || quotation.party_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-500">Valid till: </span>
                              <span className="font-medium text-slate-900 dark:text-white">
                                {new Date(quotation.valid_till).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Value: </span>
                              <span className="font-bold text-green-700 dark:text-green-400">
                                ₹{(quotation.grand_total || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <Link href={`/sales-orders/new?quotation=${encodeURIComponent(quotation.name)}`}>
                              <Button className="h-9 bg-emerald-600 hover:bg-emerald-700">
                                <Package className="h-4 w-4 mr-2" />
                                Create Sales Order
                              </Button>
                            </Link>
                            <Link href={`/crm/quotations/${encodeURIComponent(quotation.name)}`}>
                              <Button variant="outline" className="h-9">
                                View Quotation
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
