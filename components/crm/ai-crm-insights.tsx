"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface AICrmInsightsProps {
  accessibleModules: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  atRiskDeals: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  highProbOpportunities: any[]
}

interface CrmInsightResult {
  executive_summary: string
  at_risk_analysis?: {
    identified_risk_deals: string[]
    risk_factors: string[]
    recommended_mitigation: string
  }
  opportunity_analysis?: {
    top_prospects: string[]
    key_drivers: string[]
    recommended_closing_actions: string[]
  }
}

type TabId = "summary" | "risks" | "actions"

// ── Health Score ─────────────────────────────────────────────────────────────
function PipelineHealthGauge({ score }: { score: number }) {
  const clamp = Math.max(0, Math.min(100, score))
  const color =
    clamp >= 70 ? "#10b981" : clamp >= 40 ? "#f59e0b" : "#ef4444"
  const label =
    clamp >= 70 ? "Healthy" : clamp >= 40 ? "Moderate" : "At Risk"
  // SVG arc: r=28, circumference=~175.9
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = (clamp / 100) * circ

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
        <text x="36" y="40" textAnchor="middle" fill="white" fontSize="14" fontWeight="700">
          {clamp}
        </text>
      </svg>
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
    </div>
  )
}

// ── Checklist item ────────────────────────────────────────────────────────────
function ActionItem({ text, checked, onToggle }: { text: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
        checked
          ? "bg-emerald-500/5 border-emerald-500/20 opacity-60"
          : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600"
      }`}
    >
      <span
        className={`mt-0.5 w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
          checked ? "bg-emerald-500 border-emerald-500" : "border-slate-600"
        }`}
      >
        {checked && (
          <span className="material-symbols-outlined text-white" style={{ fontSize: 11 }}>check</span>
        )}
      </span>
      <span className={`text-[11px] leading-relaxed ${checked ? "line-through text-slate-500" : "text-slate-300"}`}>
        {text}
      </span>
    </button>
  )
}

// ── Dismissible at-risk card ──────────────────────────────────────────────────
function RiskCard({
  dealName,
  riskFactor,
  onDismiss,
  onView,
}: {
  dealName: string
  riskFactor?: string
  onDismiss: () => void
  onView: () => void
}) {
  return (
    <div className="group relative flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl hover:bg-amber-500/10 transition-all">
      <div className="w-8 h-8 bg-amber-500/10 text-amber-400 flex items-center justify-center rounded-full shrink-0 mt-0.5">
        <span className="material-symbols-outlined text-base">warning</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-white truncate">{dealName}</p>
        {riskFactor && (
          <p className="text-[10px] text-amber-300/70 mt-0.5 line-clamp-2">{riskFactor}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={onView}
            className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-0.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[12px]">open_in_new</span>
            View Deal
          </button>
          <span className="text-slate-700">·</span>
          <button
            onClick={onDismiss}
            className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[12px]">close</span>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export function AICrmInsights({
  accessibleModules,
  atRiskDeals = [],
  highProbOpportunities = [],
}: AICrmInsightsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<CrmInsightResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>("summary")
  const [checkedActions, setCheckedActions] = useState<Set<number>>(new Set())
  const [dismissedRisks, setDismissedRisks] = useState<Set<string>>(new Set())

  // Compute a simple pipeline health score (0-100) from props data
  const healthScore = (() => {
    const total = atRiskDeals.length + highProbOpportunities.length
    if (total === 0) return 50
    const riskWeight = atRiskDeals.length / total
    return Math.round((1 - riskWeight * 0.8) * 100)
  })()

  const handleGenerateInsights = async () => {
    try {
      setLoading(true)
      setError(null)
      setCheckedActions(new Set())
      setDismissedRisks(new Set())

      const payload = {
        at_risk_pipeline: atRiskDeals.map(deal => ({
          customer: deal.customer_name,
          days_inactive: deal.days_since_activity,
          reason: deal.reason,
        })),
        high_probability_pipeline: highProbOpportunities.map(opp => ({
          customer: opp.customer_name || opp.party_name,
          stage: opp.sales_stage,
          amount: opp.opportunity_amount,
          probability: opp.probability,
        })),
      }

      const response = await fetch("/api/ai/crm-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: { pipeline_data: JSON.stringify(payload) } }),
      })

      let data
      try { data = await response.json() }
      catch { throw new Error(`Failed to generate insights: ${response.statusText}`) }

      if (!response.ok) throw new Error(data.error || `Failed: ${response.statusText}`)
      if (data.error) throw new Error(data.error)
      if (data.result && typeof data.result === "object") {
        setInsights(data.result)
        setActiveTab("summary")
      } else {
        throw new Error("Invalid format received from AI.")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred. Please check the AI Service configuration."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const hasAccess = accessibleModules.includes("quotations") || accessibleModules.includes("crm")
  const hasData = atRiskDeals.length > 0 || highProbOpportunities.length > 0

  const allActions = [
    ...(insights?.at_risk_analysis?.risk_factors?.map(f => `[Risk] ${f}`) ?? []),
    ...(insights?.opportunity_analysis?.recommended_closing_actions ?? []),
  ]
  // Use real atRiskDeals from props as source of truth; fall back to AI-named deals if props are empty
  const activeRiskDeals = atRiskDeals.length > 0
    ? atRiskDeals.filter(d => !dismissedRisks.has(d.name))
    : (insights?.at_risk_analysis?.identified_risk_deals ?? [])
        .filter(d => !dismissedRisks.has(d))
        .map((name, i) => ({ name, customer_name: name, days_since_activity: 0, reason: insights?.at_risk_analysis?.risk_factors?.[i] || '' }))
  const riskCount = activeRiskDeals.length
  const doneCount = checkedActions.size

  // ── Shared header ──────────────────────────────────────────────────────────
  const Header = ({ isActive }: { isActive: boolean }) => (
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
      <div className="flex items-center gap-2">
        <span className={`w-8 h-8 flex items-center justify-center rounded-full ${isActive ? "bg-emerald-500/10" : "bg-blue-500/10"}`}>
          <span className={`material-symbols-outlined text-xl ${isActive ? "text-emerald-400" : "text-blue-400"} ${loading ? "animate-pulse" : ""}`}>
            psychology
          </span>
        </span>
        <h4 className="font-bold text-sm text-white tracking-wider uppercase">AI Pipeline Intel</h4>
      </div>
      <div className="flex items-center gap-2">
        {insights && (
          <button onClick={handleGenerateInsights} title="Re-run analysis" className="text-slate-500 hover:text-white transition">
            <span className="material-symbols-outlined text-sm">refresh</span>
          </button>
        )}
        <div className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : loading ? "bg-blue-500 animate-pulse" : "bg-slate-600"}`} />
      </div>
    </div>
  )

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-xl p-6 h-full flex flex-col w-full">
        <Header isActive={false} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-slate-800 rounded-full" />
            <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-400 animate-pulse">neurology</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white animate-pulse">Analyzing Pipeline…</p>
            <p className="text-[10px] text-slate-500 mt-1">Evaluating risk & closing drivers</p>
          </div>
          {/* Skeleton shimmer */}
          <div className="w-full space-y-2 mt-2">
            {[80, 60, 72, 50].map((w, i) => (
              <div key={i} className="h-3 bg-slate-800 rounded-full animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Idle (no insights yet) ─────────────────────────────────────────────────
  if (!insights && !error) {
    return (
      <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-xl p-6 h-full flex flex-col w-full">
        <Header isActive={false} />

        {/* Mini pre-analysis stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/50">
            <p className="text-2xl font-bold text-amber-400">{atRiskDeals.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">At-Risk Deals</p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/50">
            <p className="text-2xl font-bold text-emerald-400">{highProbOpportunities.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Hot Prospects</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
          <span className="material-symbols-outlined text-4xl text-slate-700 mb-3">analytics</span>
          <h3 className="text-white font-semibold text-sm mb-1">Pipeline Intelligence Ready</h3>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-5">
            AI will analyze your {atRiskDeals.length + highProbOpportunities.length} active pipeline deals, identify risk patterns, and generate prioritized action steps — all in one click.
          </p>
          <button
            onClick={handleGenerateInsights}
            disabled={!hasAccess || !hasData}
            className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            {!hasAccess ? "Access Restricted" : !hasData ? "No Pipeline Data Yet" : "Generate Executive Summary"}
          </button>
        </div>
      </div>
    )
  }

  // ── Tabs (active) ──────────────────────────────────────────────────────────
  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: "summary", label: "Summary" },
    { id: "risks", label: "Risks", badge: riskCount },
    { id: "actions", label: "Actions", badge: allActions.length - doneCount || undefined },
  ]

  return (
    <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-xl p-5 h-full flex flex-col w-full">
      <Header isActive={!!insights} />

      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-3 flex items-start gap-2">
          <span className="material-symbols-outlined text-red-400 text-sm mt-0.5 shrink-0">error</span>
          <div>
            <p className="text-[10px] font-bold text-red-400 uppercase mb-0.5">Analysis Failed</p>
            <p className="text-[11px] text-red-300/80">{error}</p>
          </div>
        </div>
      )}

      {insights && (
        <>
          {/* Tab nav */}
          <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 mb-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    tab.id === "risks" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab panels */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}>

            {/* ── Summary Tab ── */}
            {activeTab === "summary" && (
              <div className="space-y-3">
                {/* Health gauge + stats row */}
                <div className="flex items-center justify-around bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                  <PipelineHealthGauge score={healthScore} />
                  <div className="space-y-2 flex-1 pl-4">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Hot Prospects</span>
                      <span className="font-bold text-emerald-400">{highProbOpportunities.length}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">At Risk</span>
                      <span className="font-bold text-amber-400">{atRiskDeals.length}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Actions Done</span>
                      <span className="font-bold text-blue-400">{doneCount}/{allActions.length}</span>
                    </div>
                  </div>
                </div>

                {/* Executive summary */}
                <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px]">summarize</span>
                    Executive Summary
                  </p>
                  <p className="text-[12px] text-slate-300 leading-relaxed">
                    {insights.executive_summary || "No summary available."}
                  </p>
                </div>

                {/* Key drivers pills */}
                {(insights.opportunity_analysis?.key_drivers ?? []).length > 0 && (
                  <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px]">trending_up</span>
                      Closing Drivers
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {insights.opportunity_analysis!.key_drivers.map((d, i) => (
                        <span key={i} className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-1 rounded-full">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top prospects quick-links */}
                {(insights.opportunity_analysis?.top_prospects ?? []).length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Top Prospects</p>
                    {insights.opportunity_analysis!.top_prospects.slice(0, 3).map((name, i) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const deal = highProbOpportunities.find((o: any) =>
                        (o.customer_name || o.party_name) === name || name.includes(o.customer_name || o.party_name)
                      )
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            if (!deal?.name) return
                            // Quotation names contain 'QTN', Opportunity names don't
                            if (deal.name.includes('QTN')) {
                              router.push('/quotations')
                            } else {
                              router.push(`/crm/opportunities/${deal.name}`)
                            }
                          }}
                          disabled={!deal?.name}
                          className="group w-full flex items-center gap-3 p-3 bg-slate-800/40 hover:bg-slate-800 rounded-xl border border-transparent hover:border-slate-700 transition-all text-left"
                        >
                          <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 ring-1 ring-blue-500/20 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-sm">person</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold text-white truncate">{name}</p>
                            {deal && (
                              <p className="text-[10px] text-slate-500">
                                {deal.probability}% · ₹{Number(deal.opportunity_amount || 0).toLocaleString("en-IN")}
                              </p>
                            )}
                          </div>
                          <span className="material-symbols-outlined text-slate-600 group-hover:text-white text-sm transition-colors">chevron_right</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Risks Tab ── */}
            {activeTab === "risks" && (
              <div className="space-y-3">
                {activeRiskDeals.length === 0 && (
                  <div className="text-center py-10">
                    <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
                    <p className="text-sm font-semibold text-white mt-2">All risks addressed</p>
                    <p className="text-[11px] text-slate-500 mt-1">No active risk signals identified.</p>
                  </div>
                )}

                {activeRiskDeals.map((deal, i) => {
                  // Use AI risk_factors as annotation if available
                  const aiReason = insights?.at_risk_analysis?.risk_factors?.[i]
                  const displayReason = deal.reason || aiReason
                  return (
                    <RiskCard
                      key={deal.name}
                      dealName={`Deal: ${deal.customer_name}`}
                      riskFactor={displayReason}
                      onDismiss={() => setDismissedRisks(prev => new Set([...prev, deal.name]))}
                      onView={() => deal.name && router.push('/quotations')}
                    />
                  )
                })}

                {/* Risk factor pills */}
                {(insights.at_risk_analysis?.risk_factors ?? []).length > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">Risk Patterns</p>
                    <div className="flex flex-wrap gap-1.5">
                      {insights.at_risk_analysis!.risk_factors.map((f, i) => (
                        <span key={i} className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-1 rounded-full">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mitigation */}
                {insights.at_risk_analysis?.recommended_mitigation && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px]">lightbulb</span>
                      Recommended Mitigation
                    </p>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {insights.at_risk_analysis.recommended_mitigation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Actions Tab ── */}
            {activeTab === "actions" && (
              <div className="space-y-2">
                {/* Progress bar */}
                {allActions.length > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
                      <span>{doneCount} of {allActions.length} completed</span>
                      <span>{Math.round((doneCount / allActions.length) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${(doneCount / allActions.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {allActions.length === 0 ? (
                  <div className="text-center py-10">
                    <span className="material-symbols-outlined text-4xl text-slate-700">task_alt</span>
                    <p className="text-sm text-slate-500 mt-2">No actions generated yet.</p>
                  </div>
                ) : (
                  allActions.map((action, i) => (
                    <ActionItem
                      key={i}
                      text={action}
                      checked={checkedActions.has(i)}
                      onToggle={() =>
                        setCheckedActions(prev => {
                          const next = new Set(prev)
                          next.has(i) ? next.delete(i) : next.add(i)
                          return next
                        })
                      }
                    />
                  ))
                )}

                {doneCount === allActions.length && allActions.length > 0 && (
                  <div className="text-center pt-3">
                    <span className="material-symbols-outlined text-3xl text-emerald-500">celebration</span>
                    <p className="text-xs font-semibold text-emerald-400 mt-1">All actions completed!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
