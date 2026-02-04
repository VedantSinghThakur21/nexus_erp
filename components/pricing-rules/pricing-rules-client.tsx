"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface PricingRule {
  name: string
  title: string
  apply_on: string
  items?: { item_code: string }[]
  item_group?: string
  selling?: number
  buying?: number
  rate_or_discount: string
  discount_percentage?: number
  discount_amount?: number
  rate?: number
  price_or_product_discount: string
  apply_rule_on_other?: string
  other_item_code?: string
  customer?: string
  customer_group?: string
  territory?: string
  valid_from?: string
  valid_upto?: string
  min_qty?: number
  max_qty?: number
  disable?: number
  priority?: number
}

interface PricingRulesClientProps {
  rules: PricingRule[]
  onToggleStatus: (ruleName: string, currentStatus: number) => Promise<void>
}

export function PricingRulesClient({ rules, onToggleStatus }: PricingRulesClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Status")
  const [businessTypeFilter, setBusinessTypeFilter] = useState("All Business Types")

  // Filter rules
  const filteredRules = useMemo(() => {
    let result = rules

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(rule =>
        rule.title.toLowerCase().includes(query) ||
        rule.name.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter === "Active") {
      result = result.filter(r => r.disable === 0)
    } else if (statusFilter === "Inactive") {
      result = result.filter(r => r.disable === 1)
    }

    return result
  }, [rules, searchQuery, statusFilter])

  // Calculate KPIs
  const activeRulesCount = rules.filter(r => r.disable === 0).length
  const totalDiscountRules = rules.filter(r => r.rate_or_discount.includes("Discount")).length

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      {/* Header */}
      <header className="h-16 bg-white dark:bg-sidebar-dark border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex-1 max-w-2xl">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-xl">search</span>
            <input
              className="w-full bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-800 rounded-full py-2.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-700 dark:text-slate-300 outline-none"
              placeholder="Ask AI anything..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-6 ml-8">
          <Link href="/pricing-rules/new">
            <button className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all shadow-sm">
              <span className="material-symbols-outlined text-xl">add</span> Create Rule
            </button>
          </Link>
          <button className="relative text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
            <span className="material-symbols-outlined text-2xl">notifications</span>
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-sidebar-dark"></span>
          </button>
          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800"></div>
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">Alex Thompson</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">Sales Admin</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm group-hover:shadow-md transition-shadow">
              AT
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="px-8 pt-8 pb-4">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Pricing Rules</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Automate conditional pricing for quotations, sales orders, and invoices</p>
        </div>

        <div className="px-8 space-y-6 pb-12">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#111827] p-6 rounded-lg border border-slate-700 shadow-sm relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Active Rules</p>
                  <h3 className="text-[28px] font-bold text-white">{activeRulesCount}</h3>
                  <p className="text-xs text-slate-400 mt-1">{rules.length - activeRulesCount} inactive</p>
                </div>
                <div className="bg-green-500/10 p-3 rounded-lg">
                  <span className="material-symbols-outlined text-green-500 text-2xl">check_circle</span>
                </div>
              </div>
            </div>

            <div className="bg-[#111827] p-6 rounded-lg border border-slate-700 shadow-sm relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Discount Rules</p>
                  <h3 className="text-[28px] font-bold text-white">{totalDiscountRules}</h3>
                  <p className="text-xs text-slate-400 mt-1">{rules.length - totalDiscountRules} rate override</p>
                </div>
                <div className="bg-blue-500/10 p-3 rounded-lg">
                  <span className="material-symbols-outlined text-blue-500 text-2xl">trending_up</span>
                </div>
              </div>
            </div>

            <div className="bg-[#111827] p-6 rounded-lg border border-slate-700 shadow-sm relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Total Rules</p>
                  <h3 className="text-[28px] font-bold text-white">{rules.length}</h3>
                  <p className="text-xs text-slate-400 mt-1">Across all business types</p>
                </div>
                <div className="bg-purple-500/10 p-3 rounded-lg">
                  <span className="material-symbols-outlined text-purple-500 text-2xl">settings</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-sidebar-dark p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-700 dark:text-slate-300 outline-none"
                placeholder="Search by rule name..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <select
                className="min-w-[160px] py-2 pl-3 pr-10 bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary transition-all text-slate-700 dark:text-slate-300 cursor-pointer outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
              <select
                className="min-w-[180px] py-2 pl-3 pr-10 bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary transition-all text-slate-700 dark:text-slate-300 cursor-pointer outline-none"
                value={businessTypeFilter}
                onChange={(e) => setBusinessTypeFilter(e.target.value)}
              >
                <option>All Business Types</option>
                <option>B2B Enterprise</option>
                <option>SMB Retail</option>
              </select>
            </div>
          </div>

          {/* Rules List */}
          <div className="bg-white dark:bg-sidebar-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h5 className="font-bold text-slate-900 dark:text-white">Pricing Rules ({filteredRules.length})</h5>
              <p className="text-xs text-slate-500 mt-0.5">Manage and monitor your pricing rules</p>
            </div>

            {filteredRules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-5xl">inventory_2</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No pricing rules found</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-xs px-4">
                  {searchQuery || statusFilter !== "All Status"
                    ? "Try adjusting your filters"
                    : "Get started by creating your first pricing rule to automate your sales workflow."}
                </p>
                {!searchQuery && statusFilter === "All Status" && (
                  <Link href="/pricing-rules/new">
                    <button className="mt-8 bg-slate-900 dark:bg-primary hover:bg-slate-800 dark:hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-md">
                      <span className="material-symbols-outlined text-xl">add</span> Create First Rule
                    </button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {filteredRules.map((rule) => (
                  <div
                    key={rule.name}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-lg hover:shadow-md transition-shadow bg-slate-50 dark:bg-slate-900/50"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {rule.title}
                        </h3>
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                          rule.disable === 0
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {rule.disable === 0 ? "Active" : "Inactive"}
                        </span>
                        {rule.priority && (
                          <span className="px-2.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            Priority: {rule.priority}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <strong>Apply On:</strong> {rule.apply_on}
                          {rule.item_group && ` (${rule.item_group})`}
                        </span>
                        
                        {rule.rate_or_discount === "Discount Percentage" && rule.discount_percentage && (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                            <strong>Discount:</strong> {rule.discount_percentage}%
                          </span>
                        )}
                        
                        {rule.rate_or_discount === "Discount Amount" && rule.discount_amount && (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                            <strong>Discount:</strong> ₹{rule.discount_amount}
                          </span>
                        )}
                        
                        {rule.rate_or_discount === "Rate" && rule.rate && (
                          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                            <strong>Rate:</strong> ₹{rule.rate}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                        {rule.customer_group && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            Customer Group: {rule.customer_group}
                          </span>
                        )}
                        {rule.territory && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            Territory: {rule.territory}
                          </span>
                        )}
                        {rule.min_qty && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            Min Qty: {rule.min_qty}
                          </span>
                        )}
                        {rule.valid_from && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">schedule</span>
                            {new Date(rule.valid_from).toLocaleDateString()}
                            {rule.valid_upto && ` - ${new Date(rule.valid_upto).toLocaleDateString()}`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 md:mt-0">
                      <button
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          rule.disable === 0
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            : 'bg-primary text-white hover:bg-blue-700'
                        }`}
                        onClick={() => onToggleStatus(rule.name, rule.disable || 0)}
                      >
                        {rule.disable === 0 ? "Disable" : "Enable"}
                      </button>
                      <Link href={`/pricing-rules/${rule.name}`}>
                        <button className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                          Edit
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
