"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Filter, Package, CheckCircle, Clock, IndianRupee, Calendar, ArrowRight, Sparkles, TrendingUp, Truck } from "lucide-react"
import type { SalesOrder } from "@/app/actions/sales-orders"

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
  { id: "ready", label: "Ready for Sales Order" }
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
      return { label: "On Time", color: "emerald", glow: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" }
    }
    if (order.per_delivered && order.per_delivered > 0) {
      return { label: "In Progress", color: "blue", glow: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" }
    }
    return { label: "Delayed", color: "red", glow: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" }
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
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-900">
      {/* Header - removed AVARIQ logo per requirements */}
      <header className="h-16 bg-white dark:bg-card-dark border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 w-full z-10 sticky top-0">
        <div className="flex-1 max-w-2xl">
          <div className="relative group">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Sparkles className="h-5 w-5" />
            </span>
            <input
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg leading-5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="Ask AI anything about your sales orders..."
              type="text"
            />
          </div>
        </div>
        {/* Removed New Sales Order button as per request */}
      </header>

      <main className="flex-1 w-full flex flex-col min-w-0 overflow-y-auto custom-scrollbar p-8 bg-white dark:bg-slate-900">
        <div className="max-w-[1600px] mx-auto w-full">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Sales Orders</h1>
            <p className="text-base text-slate-500 dark:text-slate-400 mt-1">
              Manage enterprise sales orders and monitor fulfillment performance with AI-driven insights.
            </p>
          </div>

          {/* KPI Cards - exact match to leads page styling */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {/* Draft */}
            <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative overflow-hidden group hover:border-blue-400 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">DRAFT</span>
                <div className="p-2 rounded-lg bg-slate-600/10 text-slate-400">
                  <Package className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-[28px] font-bold text-white leading-none">{stats.draft}</span>
              </div>
              <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-slate-500 w-[20%] rounded-full"></div>
              </div>
            </div>

            {/* Confirmed */}
            <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative overflow-hidden group hover:border-blue-400 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">CONFIRMED</span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-[28px] font-bold text-white leading-none">{stats.confirmed}</span>
              </div>
              <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[60%] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative overflow-hidden group hover:border-blue-400 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">IN PROGRESS</span>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-[28px] font-bold text-white leading-none">{stats.inProgress}</span>
              </div>
              <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[0%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
              </div>
            </div>

            {/* Total Value */}
            <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative overflow-hidden group hover:border-blue-400 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">TOTAL VALUE</span>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <IndianRupee className="h-5 w-5" />
                </div>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-[28px] font-bold text-white leading-none">₹{stats.totalValue.toLocaleString()}</span>
              </div>
              <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 w-[85%] rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
              </div>
            </div>
          </div>

          {/* Tabs and Search */}
          <div className="flex flex-col lg:flex-row justify-between items-center mb-8 space-y-4 lg:space-y-0 gap-8">
            <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl w-full lg:w-auto">
              {STATUS_TABS.map((tab) => {
                const count = tab.id === "all" ? orders.length : readyQuotations.length
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setCurrentPage(1)
                    }}
                    className={`flex-1 lg:flex-none px-8 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                      activeTab === tab.id
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    {tab.label} ({count})
                  </button>
                )
              })}
            </div>

            <div className="flex items-center space-x-4 w-full lg:flex-1 lg:max-w-2xl">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <Search className="h-5 w-5" />
                </span>
                <input
                  className="block w-full pl-11 pr-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl leading-5 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-slate-400"
                  placeholder="Search by ID, customer, or items..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <button className="flex items-center px-6 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <Filter className="h-5 w-5 mr-2" /> Filter
              </button>
            </div>
          </div>

          {/* Content based on active tab */}
          {activeTab === "all" ? (
            <div className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-8 py-5 text-left text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Order ID</th>
                      <th className="px-8 py-5 text-left text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                      <th className="px-8 py-5 text-left text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Order Date</th>
                      <th className="px-8 py-5 text-left text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Items</th>
                      <th className="px-8 py-5 text-left text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                      <th className="px-8 py-5 text-left text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">AI Fulfillment Risk</th>
                      <th className="px-8 py-5 text-left text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">AI Insight</th>
                      <th className="px-8 py-5 text-left text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-8 py-5 text-right text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-card-dark">
                    {paginatedOrders.map((order) => {
                      const risk = getAIRisk(order)
                      const insight = getAIInsight(order)
                      const InsightIcon = insight.icon

                      return (
                        <tr key={order.name} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                          <td className="px-8 py-6 whitespace-nowrap text-[16px] font-semibold text-primary">
                            <Link href={`/sales-orders/${order.name}`}>{order.name}</Link>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap text-[16px] text-slate-900 dark:text-slate-100">
                            {order.customer_name || order.customer}
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap text-[16px] text-slate-500 dark:text-slate-400">
                            {formatDate(order.transaction_date)}
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap text-[16px] text-slate-500 dark:text-slate-400">
                            {order.total_qty || 0} items
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap text-[16px] font-semibold text-slate-900 dark:text-white">
                            {order.currency} {order.grand_total.toLocaleString()}
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className={`flex items-center text-${risk.color}-600 dark:text-${risk.color}-400 text-xs font-bold uppercase tracking-tight`}>
                              <span className={`w-2.5 h-2.5 rounded-full ${risk.glow} mr-2`}></span>
                              {risk.label}
                            </div>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${insight.color}`}>
                              <InsightIcon className="h-4 w-4 mr-1" />
                              {insight.label}
                            </span>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <span className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md ${getStatusColor(order.status)}`}>
                              {order.delivery_status || order.status}
                            </span>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-3">
                              <Link href={`/sales-orders/${order.name}`}>
                                <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                  View
                                </button>
                              </Link>
                              <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center transition-colors">
                                <Truck className="h-[18px] w-[18px] mr-1.5" />
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
              <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} entries
                </span>
                <div className="flex space-x-3">
                  <button
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm disabled:opacity-50 font-medium"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors disabled:opacity-50"
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
            <div className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
              {readyQuotations.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p className="font-medium text-lg mb-2">No quotations ready</p>
                  <p className="text-sm mt-2 mb-4">Submit a quotation to see it here</p>
                  <Link href="/crm/quotations">
                    <button className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
                      Go to Quotations
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {readyQuotations.map((quotation) => (
                    <div
                      key={quotation.name}
                      className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:shadow-md transition-all bg-green-50/50 dark:bg-green-950/20"
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
                              <button className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center transition-colors">
                                <Package className="h-4 w-4 mr-2" />
                                Create Sales Order
                              </button>
                            </Link>
                            <Link href={`/crm/quotations/${encodeURIComponent(quotation.name)}`}>
                              <button className="px-6 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium">
                                View Quotation
                              </button>
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
