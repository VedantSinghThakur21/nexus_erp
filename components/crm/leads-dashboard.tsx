"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { updateLeadStatus } from "@/app/actions/crm"
import { PageHeader } from "@/components/page-header"

interface Lead {
  name: string
  lead_name: string
  email_id: string
  mobile_no: string
  status: string
  company_name: string
  job_title?: string
  territory?: string
  source?: string
  industry?: string
}

interface LeadsDashboardProps {
  leads: Lead[]
}

// Mock AI score calculation
function calculateAIScore(lead: Lead): number {
  let score = 50
  if (lead.email_id) score += 10
  if (lead.mobile_no) score += 10
  if (lead.company_name) score += 15
  if (lead.job_title) score += 10
  if (lead.status === "Interested") score += 20
  if (lead.status === "Replied") score += 15
  if (lead.status === "Opportunity") score += 25
  return Math.min(100, score + Math.floor(Math.random() * 10))
}

// Helper to get initials
function getInitials(name: string): string {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// Helper to get stage badge color
function getStageColor(stage: string): string {
  const colors: Record<string, string> = {
    'Lead': 'bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400',
    'Open': 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    'Replied': 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    'Interested': 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
    'Opportunity': 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    'Quotation': 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    'Lost Quotation': 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
    'Converted': 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    'Do Not Contact': 'bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400'
  }
  return colors[stage] || 'bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400'
}

// Helper to get confidence bar color
function getConfidenceColor(confidence: number): string {
  if (confidence >= 75) return 'bg-emerald-500'
  if (confidence >= 50) return 'bg-primary'
  return 'bg-amber-400'
}

// Helper to get confidence text color
function getConfidenceTextColor(confidence: number): string {
  if (confidence >= 75) return 'text-emerald-500'
  if (confidence >= 50) return 'text-primary'
  return 'text-amber-500'
}

export function LeadsDashboard({ leads }: LeadsDashboardProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  // Enrich leads with AI scores
  const leadsWithScores = useMemo(() => {
    return leads.map(lead => ({
      ...lead,
      aiScore: calculateAIScore(lead)
    }))
  }, [leads])

  // Filter high-probability opportunities (score >= 70, status = Opportunity or Quotation)
  const highProbOpportunities = useMemo(() => {
    return leadsWithScores
      .filter(l => (l.status === "Opportunity" || l.status === "Quotation") && l.aiScore >= 70)
      .slice(0, 3)
  }, [leadsWithScores])

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalLeads = leads.length
    const convertedLeads = leads.filter(l => l.status === "Converted").length
    const winRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0.0"

    // Pipeline value (mock calculation based on high-confidence opportunities)
    const pipelineValue = (highProbOpportunities.length * 315000).toLocaleString()

    // Revenue MTD (mock)
    const revenueMTD = "2.45M"

    // Active leads count
    const activeLeads = leads.filter(l =>
      l.status !== "Converted" &&
      l.status !== "Do Not Contact" &&
      l.status !== "Lost Quotation"
    ).length

    return {
      winRate: `${winRate}%`,
      pipelineValue: `$${pipelineValue}`,
      revenueMTD: `$${revenueMTD}`,
      activeLeads: activeLeads.toLocaleString()
    }
  }, [leads, highProbOpportunities])

  // Sales funnel data
  const funnelData = useMemo(() => {
    const discovery = leads.filter(l => l.status === "Open" || l.status === "Lead").length
    const proposal = leads.filter(l => l.status === "Replied" || l.status === "Interested").length
    const negotiation = leads.filter(l => l.status === "Opportunity" || l.status === "Quotation").length

    const maxCount = Math.max(discovery, proposal, negotiation, 1)

    return [
      {
        stage: "Discovery",
        value: "$4.2M",
        count: discovery,
        width: 100
      },
      {
        stage: "Proposal",
        value: "$3.1M",
        count: proposal,
        width: Math.round((proposal / maxCount) * 66)
      },
      {
        stage: "Negotiation",
        value: "$2.8M",
        count: negotiation,
        width: Math.round((negotiation / maxCount) * 41)
      }
    ]
  }, [leads])

  // Lead source data (mock distribution)
  const leadSourceData = useMemo(() => {
    const totalLeads = leads.length
    const direct = Math.round(totalLeads * 0.65)
    const referral = Math.round(totalLeads * 0.20)

    return {
      total: totalLeads,
      direct: { count: direct, percent: 65 },
      referral: { count: referral, percent: 20 }
    }
  }, [leads])

  // Team activity (mock data from recent conversions)
  const teamActivity = [
    {
      icon: "check_circle",
      color: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500",
      action: "Closed Deal",
      member: "Sarah Jenkins",
      account: "Cyberdyne Corp",
      time: "2 Minutes Ago"
    },
    {
      icon: "person_add",
      color: "bg-blue-50 dark:bg-blue-500/10 text-blue-500",
      action: "New Lead",
      member: "Mike Rossi",
      account: "TechFlow Systems",
      time: "15 Minutes Ago"
    },
    {
      icon: "mail",
      color: "bg-purple-50 dark:bg-purple-500/10 text-purple-500",
      action: "Outbound",
      member: "David Geller",
      account: "Stark Industries",
      time: "45 Minutes Ago"
    },
    {
      icon: "calendar_today",
      color: "bg-amber-50 dark:bg-amber-500/10 text-amber-500",
      action: "Meeting Set",
      member: "Amy Pond",
      account: "Waltham Co.",
      time: "1 Hour Ago"
    }
  ]

  return (
    <div className="bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <PageHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <Link href="/crm/new">
          <button className="bg-primary hover:bg-primary/90 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition">
            <span className="material-symbols-outlined text-lg">add</span>
            New Lead
          </button>
        </Link>
      </PageHeader>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-background-dark custom-scrollbar">
        <div className="max-w-full mx-auto space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Win Rate */}
            <div className="bg-[#111827] p-7 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[160px] border border-slate-800/50 w-full">
              <div className="flex items-start justify-between">
                <p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                  Win Rate
                </p>
                <span className="material-symbols-outlined text-blue-500 text-2xl">
                  trending_up
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-[32px] font-bold text-white leading-tight">{kpis.winRate}</h3>
                <p className="mt-2 text-[14px] font-semibold text-blue-500 flex items-center">
                  <span className="material-symbols-outlined text-sm mr-1">north</span> +2.4%
                </p>
              </div>
            </div>

            {/* Pipeline Value */}
            <div className="bg-[#111827] p-7 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[160px] border border-slate-800/50 w-full">
              <div className="flex items-start justify-between">
                <p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                  Pipeline Value
                </p>
                <span className="material-symbols-outlined text-emerald-500 text-2xl">
                  account_balance_wallet
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-[32px] font-bold text-white leading-tight">{kpis.pipelineValue}</h3>
                <div className="mt-4 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[65%] rounded-full"></div>
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  <span>Target: $20M</span>
                  <span>65% Achieved</span>
                </div>
              </div>
            </div>

            {/* Revenue MTD */}
            <div className="bg-[#111827] p-7 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[160px] border border-slate-800/50 w-full">
              <div className="flex items-start justify-between">
                <p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                  Revenue MTD
                </p>
                <span className="material-symbols-outlined text-slate-400 text-2xl">
                  insights
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-[32px] font-bold text-white leading-tight">{kpis.revenueMTD}</h3>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-700"></span>
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                </div>
              </div>
            </div>

            {/* Active Leads */}
            <div className="bg-[#111827] p-7 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[160px] border border-slate-800/50 w-full">
              <div className="flex items-start justify-between">
                <p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                  Active Leads
                </p>
                <span className="material-symbols-outlined text-amber-400 text-2xl">
                  electric_bolt
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-[32px] font-bold text-white leading-tight">{kpis.activeLeads}</h3>
                <div className="mt-4 inline-flex px-3 py-1.5 rounded-full bg-blue-900/30 border border-blue-500/30 items-center">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                    AI Confidence High
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            {/* Left Column */}
            <div className="col-span-12 xl:col-span-8 space-y-8">
              {/* High-Probability Opportunities Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                    High-Probability Opportunities
                  </h4>
                  <Link href="/crm">
                    <button className="text-xs font-bold text-primary hover:text-primary/80 uppercase tracking-wider transition-colors">
                      Full Pipeline
                    </button>
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                        <th className="px-8 py-5">Account</th>
                        <th className="px-8 py-5">Stage</th>
                        <th className="px-8 py-5">Value</th>
                        <th className="px-8 py-5 text-right">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {highProbOpportunities.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-8 py-12 text-center text-slate-500">
                            No high-probability opportunities found
                          </td>
                        </tr>
                      ) : (
                        highProbOpportunities.map((lead) => (
                          <tr
                            key={lead.name}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                            onClick={() => router.push(`/crm/${lead.name}`)}
                          >
                            <td className="px-8 py-5 flex items-center gap-4">
                              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[11px] font-bold">
                                {getInitials(lead.company_name || lead.lead_name)}
                              </div>
                              <span className="text-[15px] font-semibold">
                                {lead.company_name || lead.lead_name}
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              <span className={`px-2.5 py-1 ${getStageColor(lead.status)} text-[10px] font-bold rounded-md uppercase`}>
                                {lead.status}
                              </span>
                            </td>
                            <td className="px-8 py-5 font-semibold text-slate-700 dark:text-slate-300">
                              ${(Math.random() * 500000 + 300000).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center justify-end gap-4">
                                <span className={`text-sm font-bold ${getConfidenceTextColor(lead.aiScore)}`}>
                                  {lead.aiScore}%
                                </span>
                                <div className="w-32 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`${getConfidenceColor(lead.aiScore)} h-full`}
                                    style={{ width: `${lead.aiScore}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sales Funnel & Lead Source */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Sales Funnel */}
                <div className="bg-white dark:bg-slate-900 p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-400 text-xl">
                        filter_alt
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-[0.15em]">
                        Sales Funnel
                      </h4>
                    </div>
                  </div>
                  <div className="space-y-6">
                    {funnelData.map((item, index) => (
                      <div key={item.stage}>
                        <div className="flex justify-between text-[11px] font-bold uppercase text-slate-400 mb-2">
                          <span>{item.stage}</span>
                          <span>{item.value}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-9 rounded-xl overflow-hidden relative">
                          <div
                            className={`absolute inset-y-0 left-0 flex items-center px-4 text-white text-[11px] font-bold ${index === 0
                                ? 'bg-gradient-to-r from-blue-700 to-blue-600'
                                : index === 1
                                  ? 'bg-gradient-to-r from-blue-600 to-blue-500'
                                  : 'bg-gradient-to-r from-blue-500 to-blue-400'
                              }`}
                            style={{ width: `${item.width}%` }}
                          >
                            {item.count} Deals
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lead Source */}
                <div className="bg-white dark:bg-slate-900 p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="material-symbols-outlined text-slate-400 text-xl">
                      pie_chart
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-[0.15em]">
                      Leads Source
                    </h4>
                  </div>
                  <div className="flex items-center justify-around h-full pb-6">
                    {/* Donut Chart */}
                    <div className="relative w-40 h-40">
                      <div
                        className="w-full h-full rounded-full"
                        style={{
                          background:
                            'conic-gradient(#3f51b5 0% 65%, #10b981 65% 85%, #e2e8f0 85% 100%)'
                        }}
                      ></div>
                      <div className="absolute inset-5 bg-white dark:bg-slate-900 rounded-full flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold">{leadSourceData.total}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">
                          Total
                        </span>
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-primary"></span>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">
                            Direct
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {leadSourceData.direct.percent}% ({leadSourceData.direct.count})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">
                            Referral
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {leadSourceData.referral.percent}% ({leadSourceData.referral.count})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - AI Insights */}
            <div className="col-span-12 xl:col-span-4">
              <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-xl p-8 relative h-full flex flex-col">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-brand-yellow text-3xl">
                      bolt
                    </span>
                    <h4 className="font-bold text-lg text-white tracking-wider uppercase">
                      AI INSIGHTS
                    </h4>
                  </div>
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
                <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-brand-yellow text-xl">
                      warning
                    </span>
                    <span className="text-[12px] font-bold text-brand-yellow uppercase tracking-widest">
                      DEAL AT RISK
                    </span>
                  </div>
                  <h5 className="font-bold text-xl text-white mb-2">
                    Acme Corp HQ - Phase II
                  </h5>
                  <p className="text-[14px] text-slate-400 mb-6 leading-relaxed">
                    Decision maker hasn't opened proposal for 5 days. Competitive threat detected.
                  </p>
                  <button className="w-full py-4 bg-brand-yellow hover:bg-amber-400 text-slate-900 text-sm font-black rounded-xl transition-all shadow-lg shadow-amber-500/10 uppercase tracking-widest">
                    PRIORITY OUTREACH
                  </button>
                </div>
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                      RECOMMENDED ACTIONS
                    </p>
                    <button className="text-[11px] font-bold text-blue-400 uppercase tracking-widest hover:text-blue-300">
                      VIEW ALL
                    </button>
                  </div>
                  <div className="group flex items-center gap-5 p-5 bg-slate-800/40 rounded-2xl hover:bg-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-700">
                    <div className="w-12 h-12 bg-blue-500/10 text-blue-400 flex items-center justify-center rounded-full ring-1 ring-blue-500/30 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-2xl font-bold">
                        alternate_email
                      </span>
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-white">Follow up - Globtel</p>
                      <p className="text-[12px] text-slate-500">High velocity activity.</p>
                    </div>
                  </div>
                  <div className="group flex items-center gap-5 p-5 bg-slate-800/40 rounded-2xl hover:bg-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-700">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 flex items-center justify-center rounded-full ring-1 ring-emerald-500/30 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-2xl font-bold">
                        check_circle
                      </span>
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-white">Contract - Urban</p>
                      <p className="text-[12px] text-slate-500">Review is complete.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Performance Section */}
          <div className="col-span-12">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-slate-400 text-2xl">history</span>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">
                Team Performance &amp; Intelligence
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-6">
              {teamActivity.map((activity, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 hover:shadow-md transition-shadow w-full"
                >
                  <div className="flex items-center gap-4 mb-5">
                    <div
                      className={`w-12 h-12 ${activity.color} rounded-full flex items-center justify-center`}
                    >
                      <span className="material-symbols-outlined font-bold text-xl">
                        {activity.icon}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                        {activity.action}
                      </p>
                      <h4 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                        {activity.member}
                      </h4>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-col gap-1">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {activity.account}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-12 py-8 flex items-center justify-between text-[11px] text-slate-400 font-bold px-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                SYSTEMS OPERATIONAL
              </span>
              <span className="opacity-60">v4.12.0 Enterprise Ultimate</span>
            </div>
            <div className="flex items-center gap-8 uppercase tracking-widest">
              <a className="hover:text-primary transition-colors" href="#">
                API Documentation
              </a>
              <a className="hover:text-primary transition-colors" href="#">
                Technical Support
              </a>
              <a className="hover:text-primary transition-colors" href="#">
                Security Policy
              </a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}
