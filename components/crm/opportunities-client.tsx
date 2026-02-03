"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Filter, Grid, List as ListIcon, ArrowRight, TrendingUp, DollarSign, Zap, CheckCircle, AlertCircle, PauseCircle } from "lucide-react"

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

interface OpportunitiesClientProps {
  opportunities: Opportunity[]
}

const SALES_STAGES = [
  "Prospecting",
  "Qualification",
  "Proposal/Price Quote",
  "Negotiation/Review"
] as const

export function OpportunitiesClient({ opportunities }: OpportunitiesClientProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStage, setSelectedStage] = useState("All Stages")

  // Filter opportunities
  const openOpportunities = opportunities.filter(opp => opp.status === "Open")
  const wonOpportunities = opportunities.filter(opp => opp.status === "Converted")

  // Calculate stats
  const totalOpenOpportunities = openOpportunities.length
  const wonThisMonth = wonOpportunities.length
  const avgProbability = openOpportunities.length > 0
    ? (openOpportunities.reduce((sum, opp) => sum + opp.probability, 0) / openOpportunities.length).toFixed(1)
    : "0.0"

  // Filtered opportunities for table
  const filteredOpportunities = useMemo(() => {
    let result = openOpportunities

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(opp =>
        (opp.customer_name || opp.party_name || "").toLowerCase().includes(query) ||
        opp.opportunity_type.toLowerCase().includes(query)
      )
    }

    if (selectedStage !== "All Stages") {
      result = result.filter(opp => opp.sales_stage === selectedStage)
    }

    return result
  }, [openOpportunities, searchQuery, selectedStage])

  // Helper: Get owner initials (mock)
  const getOwnerInitials = (opp: Opportunity): string => {
    const owners = ["MD", "SJ", "EL", "AT", "KR", "LW"]
    return owners[Math.floor(Math.random() * owners.length)]
  }

  // Helper: Get owner name (mock)
  const getOwnerName = (initials: string): string => {
    const names: Record<string, string> = {
      "MD": "Marcus D.",
      "SJ": "Sarah J.",
      "EL": "Elena L.",
      "AT": "Alex T.",
      "KR": "Kevin R.",
      "LW": "Lisa W."
    }
    return names[initials] || "Unknown"
  }

  // Helper: Get AI status badge
  const getAIStatus = (opp: Opportunity) => {
    if (opp.probability >= 75) {
      return { icon: CheckCircle, text: "On Track", color: "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20" }
    } else if (opp.probability >= 40) {
      return { icon: PauseCircle, text: "Stalled", color: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20" }
    } else {
      return { icon: AlertCircle, text: "At Risk", color: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20" }
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Opportunities</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/crm/opportunities/new">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg flex items-center space-x-2 font-medium shadow-lg shadow-blue-600/20 transition-all">
              <span className="text-sm">+</span>
              <span>New Opportunity</span>
            </button>
          </Link>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-[1600px] mx-auto w-full">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Open Opportunities</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-[28px] font-bold text-white leading-none">{totalOpenOpportunities}</span>
              <span className="text-sm font-semibold text-blue-400 mb-1">+12%</span>
            </div>
            <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[72%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
            </div>
          </div>

          <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Won This Month</span>
              <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-[28px] font-bold text-white leading-none">{wonThisMonth}</span>
              <span className="text-sm font-semibold text-emerald-400 mb-1">Target: 40</span>
            </div>
            <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 w-[70%] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
            </div>
          </div>

          <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Avg. Probability</span>
              <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
                <Zap className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-[28px] font-bold text-white leading-none">{avgProbability}%</span>
              <span className="text-sm font-semibold text-slate-400 mb-1">AI Rating</span>
            </div>
            <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.5)]" style={{ width: `${avgProbability}%` }}></div>
            </div>
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-slate-800 pb-1">
          <div className="flex space-x-10">
            <button 
              onClick={() => setSelectedStage("All Stages")}
              className={`pb-4 text-[14px] font-bold ${selectedStage === "All Stages" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"} transition-colors`}
            >
              All Stages
            </button>
            {SALES_STAGES.map(stage => (
              <button 
                key={stage}
                onClick={() => setSelectedStage(stage)}
                className={`pb-4 text-[14px] font-semibold ${selectedStage === stage ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"} transition-colors`}
              >
                {stage}
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-4 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg h-10 pl-10 pr-3 text-sm outline-none w-64 font-medium text-slate-600 dark:text-slate-300 placeholder:text-slate-400"
                placeholder="Search deals..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="flex items-center h-10 space-x-2 text-sm font-medium px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300">
              <Filter className="h-4 w-4 text-slate-500" />
              <span>Filter</span>
            </button>
            <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700 h-10 items-center">
              <button 
                onClick={() => setViewMode("list")}
                className={`flex items-center justify-center space-x-2 px-5 h-8 rounded-md ${viewMode === "list" ? "bg-white dark:bg-slate-800 shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"} text-sm font-bold transition-all`}
              >
                <ListIcon className="h-4 w-4" />
                <span>List</span>
              </button>
              <button 
                onClick={() => setViewMode("kanban")}
                className={`flex items-center justify-center space-x-2 px-5 h-8 rounded-md ${viewMode === "kanban" ? "bg-white dark:bg-slate-800 shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"} text-sm font-medium transition-all`}
              >
                <Grid className="h-4 w-4" />
                <span>Kanban</span>
              </button>
            </div>
          </div>
        </div>

        {/* Opportunities Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden mb-12">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-[0.1em] text-slate-500 w-1/4">Deal Name</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Value</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Owner</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">Stage & AI Status</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-[0.1em] text-slate-500 text-center">Status</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-[0.1em] text-slate-500 text-right">Probability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOpportunities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-500">
                    No opportunities found
                  </td>
                </tr>
              ) : (
                filteredOpportunities.map((opp) => {
                  const ownerInitials = getOwnerInitials(opp)
                  const ownerName = getOwnerName(ownerInitials)
                  const aiStatus = getAIStatus(opp)
                  const AIStatusIcon = aiStatus.icon

                  return (
                    <tr key={opp.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => router.push(`/crm/opportunities/${opp.name}`)}>
                      <td className="px-8 py-6">
                        <p className="text-[16px] font-bold text-slate-900 dark:text-white mb-1">{opp.customer_name || opp.party_name}</p>
                        <p className="text-[14px] text-slate-500 font-medium">{opp.opportunity_type}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[16px] font-bold text-slate-900 dark:text-white">
                          ${(opp.opportunity_amount / 1000).toFixed(opp.opportunity_amount >= 1000000 ? 1 : 0)}{opp.opportunity_amount >= 1000000 ? 'M' : 'K'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 ${ownerInitials === "MD" ? "bg-blue-100 text-blue-600" : ownerInitials === "SJ" ? "bg-purple-100 text-purple-600" : "bg-amber-100 text-amber-600"} rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-slate-800`}>
                            {ownerInitials}
                          </div>
                          <span className="text-[14px] font-medium text-slate-600 dark:text-slate-400">{ownerName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-4">
                          <span className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-[11px] font-extrabold uppercase tracking-wide rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                            {opp.sales_stage.split('/')[0]}
                          </span>
                          <span className={`px-3 py-1 ${aiStatus.color} text-[10px] font-bold uppercase rounded border flex items-center tracking-widest`}>
                            <AIStatusIcon className="h-3.5 w-3.5 mr-1.5" />
                            {aiStatus.text}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="px-4 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase rounded-full tracking-widest">
                          {opp.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col items-end">
                          <div className="flex items-center space-x-4">
                            <div className="w-32 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${opp.probability >= 75 ? "bg-green-500" : opp.probability >= 40 ? "bg-blue-500" : "bg-orange-500"}`}
                                style={{ width: `${opp.probability}%` }}
                              ></div>
                            </div>
                            <span className="text-[16px] font-bold text-slate-700 dark:text-slate-300">{opp.probability}%</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Won Opportunities Section */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-500/10 text-green-500 rounded-full">
                <CheckCircle className="h-5 w-5" />
              </div>
              <h3 className="text-[14px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Won Opportunities <span className="ml-3 text-slate-500 font-medium">{wonOpportunities.length} DEALS COMPLETED</span>
              </h3>
            </div>
            <button className="text-[12px] font-bold uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-all flex items-center">
              View All Won Deals <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wonOpportunities.slice(0, 3).map((opp) => (
              <Link key={opp.name} href={`/crm/opportunities/${opp.name}`}>
                <div className="bg-[#111827] rounded-xl p-6 flex items-center justify-between border border-transparent hover:border-green-500/30 transition-all cursor-pointer group">
                  <div className="flex items-center space-x-5">
                    <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 group-hover:bg-green-500/20 transition-colors">
                      <DollarSign className="h-6 w-6" />
                    </div>
                    <div>
                      <h5 className="text-[15px] font-bold text-white uppercase tracking-tight">{opp.customer_name || opp.party_name}</h5>
                      <p className="text-[10px] text-slate-500 uppercase font-extrabold tracking-widest mt-0.5">{opp.opportunity_type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold text-[18px]">
                      ${(opp.opportunity_amount / 1000).toFixed(0)}K
                    </div>
                    <div className="text-[9px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded inline-block font-extrabold uppercase tracking-widest mt-1">
                      Converted
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <footer className="p-8 border-t border-slate-200 dark:border-slate-800 text-center">
        <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] uppercase">Powered by AVARIQ Opportunity Intelligence Engine</p>
      </footer>
    </div>
  )
}
