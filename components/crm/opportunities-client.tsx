"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Filter, Grid, List as ListIcon, ArrowRight, TrendingUp, DollarSign, Zap, CheckCircle, AlertCircle, PauseCircle } from "lucide-react"
import { updateOpportunitySalesStage } from "@/app/actions/crm"
import { PageHeader } from "@/components/page-header"
import { useUser } from "@/contexts/user-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
  const { canPerform } = useUser()

  const canCreate = canPerform('crm', 'create')
  const canEdit   = canPerform('crm', 'edit')

  const [viewMode, setViewMode] = useState<"list" | "kanban">("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStage, setSelectedStage] = useState("All Stages")
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 20

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

  // Pagination calculations
  const totalPages = Math.ceil(filteredOpportunities.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedOpportunities = filteredOpportunities.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedStage])

  // Helper: extract owner display name from ERPNext owner field (email → name)
  const getOwnerDisplay = (opp: Opportunity): { initials: string; name: string } => {
    const raw = (opp as any).owner || ''
    // ERPNext owner is usually an email like "admin@example.com" or a username
    const parts = raw.split('@')[0].replace(/[._-]/g, ' ').split(' ')
    const initials = parts.map((p: string) => p[0]?.toUpperCase() || '').join('').slice(0, 2) || '?'
    const name = parts.map((p: string) => p ? p[0].toUpperCase() + p.slice(1) : '').join(' ').trim() || raw
    return { initials, name }
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

  // Handle stage change
  const handleStageChange = async (opportunityId: string, newStage: string) => {
    if (!canEdit) return
    try {
      // Static fallback probability per stage
      const probabilityMap: Record<string, number> = {
        "Prospecting": 10,
        "Qualification": 30,
        "Proposal/Price Quote": 60,
        "Negotiation/Review": 80
      }
      let probability = probabilityMap[newStage] ?? 50

      // Ask Dify for a smarter probability estimate
      try {
        const opp = opportunities.find(o => o.name === opportunityId)
        const res = await fetch('/api/ai/opportunity-probability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputs: {
              opportunity_data: JSON.stringify({
                name: opportunityId,
                new_stage: newStage,
                current_stage: opp?.sales_stage,
                opportunity_type: opp?.opportunity_type,
                party_name: opp?.party_name || opp?.customer_name,
                status: opp?.status,
              })
            }
          })
        })
        if (res.ok) {
          const data = await res.json()
          const difyProb = data.result?.probability
          if (typeof difyProb === 'number' && difyProb >= 0 && difyProb <= 100) {
            probability = Math.round(difyProb)
          }
        }
      } catch {
        // Silently use static fallback probability
      }

      await updateOpportunitySalesStage(opportunityId, newStage, probability)
      router.refresh()
    } catch (error) {
      console.error("Failed to update opportunity stage:", error)
    }
  }

  return (
    <div className="min-w-0">
      {/* Header */}
      <PageHeader />

      <main className="app-content w-full">
        <div className="app-container">
        {/* KPI Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[13px] font-medium text-muted-foreground">Open Opportunities</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-2xl font-medium text-foreground leading-none">{totalOpenOpportunities}</span>
              <span className="text-sm font-semibold text-blue-400 mb-1">+12%</span>
            </div>
            <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-[72%] rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[13px] font-medium text-muted-foreground">Won This Month</span>
              <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-2xl font-medium text-foreground leading-none">{wonThisMonth}</span>
              <span className="text-sm font-semibold text-emerald-400 mb-1">Target: 40</span>
            </div>
            <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 w-[70%] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[13px] font-medium text-muted-foreground">Avg. Probability</span>
              <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
                <Zap className="h-5 w-5" />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-2xl font-medium text-foreground leading-none">{avgProbability}%</span>
              <span className="text-sm font-semibold text-slate-400 mb-1">AI Rating</span>
            </div>
            <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.5)]" style={{ width: `${avgProbability}%` }}></div>
            </div>
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="mb-6 flex flex-col gap-4 border-b border-border pb-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex gap-6 overflow-x-auto whitespace-nowrap">
            <button
              onClick={() => setSelectedStage("All Stages")}
              className={`pb-3 text-sm font-semibold ${selectedStage === "All Stages" ? "border-b-2 border-blue-600 text-blue-600" : "text-muted-foreground hover:text-foreground"} transition-colors`}
            >
              All Stages
            </button>
            {SALES_STAGES.map(stage => (
              <button
                key={stage}
                onClick={() => setSelectedStage(stage)}
                className={`pb-3 text-sm font-semibold ${selectedStage === stage ? "border-b-2 border-blue-600 text-blue-600" : "text-muted-foreground hover:text-foreground"} transition-colors`}
              >
                {stage}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <div className="relative min-w-[220px] flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 w-full pl-10 sm:w-64"
                placeholder="Search deals..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="h-10">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span>Filter</span>
            </Button>
            <div className="flex h-10 items-center rounded-lg border border-border bg-secondary p-1">
              <button
                onClick={() => setViewMode("list")}
                className={`flex h-8 items-center justify-center space-x-2 rounded-md px-4 ${viewMode === "list" ? "bg-card text-blue-600 shadow-sm" : "text-muted-foreground hover:text-foreground"} text-sm font-semibold transition-all`}
              >
                <ListIcon className="h-4 w-4" />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`flex h-8 items-center justify-center space-x-2 rounded-md px-4 ${viewMode === "kanban" ? "bg-card text-blue-600 shadow-sm" : "text-muted-foreground hover:text-foreground"} text-sm font-medium transition-all`}
              >
                <Grid className="h-4 w-4" />
                <span>Kanban</span>
              </button>
            </div>
          </div>
        </div>

        {/* Opportunities Table */}
        <div className="mb-12 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60">
                <th className="w-1/4 px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Deal Name</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Owner</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Stage & AI Status</th>
                <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Status</th>
                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Probability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOpportunities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                    No opportunities found
                  </td>
                </tr>
              ) : (
                paginatedOpportunities.map((opp) => {
                  const { initials: ownerInitials, name: ownerName } = getOwnerDisplay(opp)
                  const aiStatus = getAIStatus(opp)
                  const AIStatusIcon = aiStatus.icon

                  return (
                    <tr key={opp.name} className="cursor-pointer transition-colors hover:bg-muted/40" onClick={() => router.push(`/crm/opportunities/${opp.name}`)}>
                      <td className="px-5 py-4">
                        <p className="mb-1 text-[15px] font-semibold text-foreground">{opp.customer_name || opp.party_name}</p>
                        <p className="text-sm font-medium text-muted-foreground">{opp.opportunity_type}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                            {ownerInitials}
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">{ownerName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center space-x-4">
                          <select
                            className={`rounded-md border border-border bg-muted px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground transition-colors ${canEdit ? "cursor-pointer hover:bg-muted/80" : "cursor-not-allowed opacity-60"}`}
                            value={opp.sales_stage}
                            onChange={(e) => handleStageChange(opp.name, e.target.value)}
                            disabled={!canEdit}
                          >
                            {SALES_STAGES.map(stage => (
                              <option key={stage} value={stage}>{stage.split('/')[0]}</option>
                            ))}
                          </select>
                          <span className={`px-3 py-1 ${aiStatus.color} text-[10px] font-bold uppercase rounded border flex items-center tracking-widest`}>
                            <AIStatusIcon className="h-3.5 w-3.5 mr-1.5" />
                            {aiStatus.text}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="px-4 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase rounded-full tracking-widest">
                          {opp.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-end">
                          <div className="flex items-center space-x-4">
                            <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full ${opp.probability >= 75 ? "bg-green-500" : opp.probability >= 40 ? "bg-blue-500" : "bg-orange-500"}`}
                                style={{ width: `${opp.probability}%` }}
                              ></div>
                            </div>
                            <span className="text-[15px] font-semibold text-foreground">{opp.probability}%</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-5">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to <span className="font-semibold text-foreground">{Math.min(endIndex, filteredOpportunities.length)}</span> of <span className="font-semibold text-foreground">{filteredOpportunities.length}</span> opportunities
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border/60 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                            : "text-foreground bg-background border border-border/60 hover:bg-muted"
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
                  className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border/60 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
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
                <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-between hover:border-emerald-500/30 transition-all cursor-pointer group">
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
                    <div className="text-[9px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded inline-block font-extrabold uppercase tracking-widest">
                      {opp.probability}% Probability
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
        </div>
      </main>

      <footer className="p-8 border-t border-slate-200 dark:border-slate-800 text-center">
        <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] uppercase">Powered by AVARIQ Opportunity Intelligence Engine</p>
      </footer>
    </div>
  )
}
