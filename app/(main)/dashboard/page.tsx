"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getDashboardStats,
  getOpportunities,
  getRecentActivities,
  getAtRiskDeals,
  getLeadsBySource,
} from "@/app/actions/dashboard";
import { formatIndianCurrency } from "@/lib/currency";

type Opportunity = {
  name: string;
  customer_name?: string;
  party_name?: string;
  sales_stage: string;
  opportunity_amount: number;
  probability: number;
  status: string;
  modified: string;
};

type Stats = {
  pipelineValue: number;
  revenue: number;
  openOpportunities: number;
  winRate: number;
  winRateChange: number;
  leadsChange: number;
};

type ActivityItem = {
  type: "closed-deal" | "new-lead" | "outbound" | "booking-scheduled";
  owner: string;
  company: string;
  time: string;
};

type AtRiskDeal = {
  name: string;
  customer_name: string;
  days_since_activity: number;
  reason: string;
};

// Helper to get initials from name
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Helper to get stage badge color
function getStageColor(stage: string): string {
  const colors: Record<string, string> = {
    Prospecting: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
    Qualification: "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400",
    "Proposal/Price Quote": "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
    "Negotiation/Review": "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };
  return colors[stage] || "bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400";
}

// Helper to get confidence bar color
function getConfidenceColor(confidence: number): string {
  if (confidence >= 75) return "bg-emerald-500";
  if (confidence >= 50) return "bg-primary";
  return "bg-amber-400";
}

// Helper to get confidence text color
function getConfidenceTextColor(confidence: number): string {
  if (confidence >= 75) return "text-emerald-500";
  if (confidence >= 50) return "text-primary";
  return "text-amber-500";
}

// Helper to get activity icon and color
function getActivityIcon(type: string): {
  icon: string;
  color: string;
  label: string;
} {
  const mapping: Record<
    string,
    { icon: string; color: string; label: string }
  > = {
    "closed-deal": {
      icon: "check_circle",
      color: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500",
      label: "Closed Deal",
    },
    "new-lead": {
      icon: "person_add",
      color: "bg-blue-50 dark:bg-blue-500/10 text-blue-500",
      label: "New Lead",
    },
    outbound: {
      icon: "mail",
      color: "bg-purple-50 dark:bg-purple-500/10 text-purple-500",
      label: "Outbound",
    },
    "booking-scheduled": {
      icon: "calendar_today",
      color: "bg-amber-50 dark:bg-amber-500/10 text-amber-500",
      label: "Meeting Set",
    },
  };
  return (
    mapping[type] || {
      icon: "circle",
      color: "bg-slate-50 dark:bg-slate-500/10 text-slate-500",
      label: "Activity",
    }
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    pipelineValue: 0,
    revenue: 0,
    openOpportunities: 0,
    winRate: 0,
    winRateChange: 0,
    leadsChange: 0,
  });
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [atRiskDeal, setAtRiskDeal] = useState<AtRiskDeal | null>(null);
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [
        statsData,
        oppsData,
        activitiesData,
        atRiskData,
        leadSourcesData,
      ] = await Promise.all([
        getDashboardStats(),
        getOpportunities(),
        getRecentActivities(),
        getAtRiskDeals(),
        getLeadsBySource(),
      ]);

      setStats({
        pipelineValue: statsData.pipelineValue,
        revenue: statsData.revenue,
        openOpportunities: statsData.openOpportunities,
        winRate: statsData.winRate,
        winRateChange: statsData.winRateChange,
        leadsChange: statsData.leadsChange,
      });
      setOpportunities(oppsData);
      setActivities(activitiesData as ActivityItem[]);
      if (atRiskData.length > 0) {
        setAtRiskDeal(atRiskData[0]);
      }
      setLeadSources(leadSourcesData);
      setLoading(false);
    } catch (err) {
      console.error("Dashboard load error:", err);
      setLoading(false);
    }
  }

  // Filter high-probability opportunities (probability >= 70)
  const highProbOpportunities = opportunities
    .filter((opp: Opportunity) => opp.probability >= 70 && opp.status === "Open")
    .sort((a: Opportunity, b: Opportunity) => b.probability - a.probability)
    .slice(0, 3);

  // Calculate Sales Funnel data from opportunities
  const funnelData = (() => {
    const stageGroups: Record<string, { count: number; value: number }> = {};

    opportunities
      .filter((opp: Opportunity) => opp.status === "Open")
      .forEach((opp: Opportunity) => {
        const stage = opp.sales_stage;
        if (!stageGroups[stage]) {
          stageGroups[stage] = { count: 0, value: 0 };
        }
        stageGroups[stage].count += 1;
        stageGroups[stage].value += opp.opportunity_amount || 0;
      });

    const funnelStages = [
      {
        name: "Discovery",
        erpStages: ["Prospecting", "Lead"],
        value: "$4.2M",
      },
      {
        name: "Proposal",
        erpStages: ["Qualification", "Qualified", "Proposal/Price Quote"],
        value: "$3.1M",
      },
      {
        name: "Negotiation",
        erpStages: ["Negotiation/Review", "Negotiation"],
        value: "$2.8M",
      },
    ];

    const result = funnelStages.map((stage) => {
      let count = 0;
      stage.erpStages.forEach((erpStage) => {
        if (stageGroups[erpStage]) {
          count += stageGroups[erpStage].count;
        }
      });
      return {
        stage: stage.name,
        value: stage.value,
        count,
      };
    });

    const maxCount = Math.max(...result.map((s) => s.count), 1);
    return result.map((item, index) => ({
      ...item,
      width: index === 0 ? 100 : Math.round((item.count / maxCount) * (100 - index * 20)),
    }));
  })();

  // Lead source data - calculate from actual API data
  const leadSourceData = (() => {
    const total = leadSources.reduce((sum, src) => sum + (src.count || 0), 0);
    
    if (total === 0 || leadSources.length === 0) {
      return {
        total: 0,
        sources: [],
        colors: []
      };
    }

    // Take top 2 sources and group rest as "Other"
    const topSources = leadSources.slice(0, 2);
    const othersCount = leadSources.slice(2).reduce((sum, s) => sum + (s.count || 0), 0);
    
    const sources = topSources.map(s => ({
      name: s.source,
      count: s.count,
      percent: Math.round((s.count / total) * 100)
    }));

    if (othersCount > 0) {
      sources.push({
        name: 'Other',
        count: othersCount,
        percent: Math.round((othersCount / total) * 100)
      });
    }

    // Assign colors
    const colorPalette = ['#3f51b5', '#10b981', '#e2e8f0'];
    
    return {
      total,
      sources,
      colors: colorPalette.slice(0, sources.length)
    };
  })();

  // Generate conic gradient for donut chart
  const donutGradient = (() => {
    if (leadSourceData.sources.length === 0) return 'conic-gradient(#e2e8f0 0% 100%)';
    
    let currentPercent = 0;
    const gradientStops = leadSourceData.sources.map((source, idx) => {
      const startPercent = currentPercent;
      currentPercent += source.percent;
      const color = leadSourceData.colors[idx];
      return `${color} ${startPercent}% ${currentPercent}%`;
    });

    return `conic-gradient(${gradientStops.join(', ')})`;
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 w-full z-10">
        <div className="relative w-[480px]">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-full py-2.5 pl-11 pr-5 text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-slate-500"
            placeholder="Ask AI anything..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-6">
          <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
          <div className="flex items-center gap-3 pl-2">
            <div className="text-right">
              <p className="text-sm font-semibold leading-tight">Adrian Chen</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                Regional Director
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden ring-2 ring-slate-100 dark:ring-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm">
              AC
            </div>
          </div>
        </div>
      </header>

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
                <h3 className="text-[32px] font-bold text-white leading-tight">
                  {stats.winRate.toFixed(1)}%
                </h3>
                <p className="mt-2 text-[14px] font-semibold text-blue-500 flex items-center">
                  <span className="material-symbols-outlined text-sm mr-1">
                    {stats.winRateChange >= 0 ? "north" : "south"}
                  </span>{" "}
                  {stats.winRateChange >= 0 ? "+" : ""}
                  {stats.winRateChange.toFixed(1)}%
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
                <h3 className="text-[32px] font-bold text-white leading-tight">
                  {formatIndianCurrency(stats.pipelineValue)}
                </h3>
                <div className="mt-4 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[65%] rounded-full"></div>
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  <span>Target: ₹200L</span>
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
                <h3 className="text-[32px] font-bold text-white leading-tight">
                  {formatIndianCurrency(stats.revenue)}
                </h3>
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
                <h3 className="text-[32px] font-bold text-white leading-tight">
                  {stats.openOpportunities.toLocaleString()}
                </h3>
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
                          <td
                            colSpan={4}
                            className="px-8 py-12 text-center text-slate-500"
                          >
                            No high-probability opportunities found
                          </td>
                        </tr>
                      ) : (
                        highProbOpportunities.map((opp) => (
                          <tr
                            key={opp.name}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                            onClick={() => router.push(`/crm/opportunities/${opp.name}`)}
                          >
                            <td className="px-8 py-5 flex items-center gap-4">
                              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[11px] font-bold">
                                {getInitials((opp.customer_name || opp.party_name) || "N/A")}
                              </div>
                              <span className="text-[15px] font-semibold">
                                {opp.customer_name || opp.party_name}
                              </span>
                            </td>
                            <td className="px-8 py-5">
                              <span
                                className={`px-2.5 py-1 ${getStageColor(
                                  opp.sales_stage
                                )} text-[10px] font-bold rounded-md uppercase`}
                              >
                                {opp.sales_stage}
                              </span>
                            </td>
                            <td className="px-8 py-5 font-semibold text-slate-700 dark:text-slate-300">
                              {formatIndianCurrency(opp.opportunity_amount)}
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex items-center justify-end gap-4">
                                <span
                                  className={`text-sm font-bold ${getConfidenceTextColor(
                                    opp.probability
                                  )}`}
                                >
                                  {opp.probability}%
                                </span>
                                <div className="w-32 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`${getConfidenceColor(
                                      opp.probability
                                    )} h-full`}
                                    style={{ width: `${opp.probability}%` }}
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
                            className={`absolute inset-y-0 left-0 flex items-center px-4 text-white text-[11px] font-bold ${
                              index === 0
                                ? "bg-gradient-to-r from-blue-700 to-blue-600"
                                : index === 1
                                ? "bg-gradient-to-r from-blue-600 to-blue-500"
                                : "bg-gradient-to-r from-blue-500 to-blue-400"
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
                          background: donutGradient,
                        }}
                      ></div>
                      <div className="absolute inset-5 bg-white dark:bg-slate-900 rounded-full flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold">
                          {leadSourceData.total || 0}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">
                          Total
                        </span>
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="flex flex-col gap-4">
                      {leadSourceData.sources.map((source, idx) => (
                        <div key={source.name} className="flex items-center gap-3">
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: leadSourceData.colors[idx] }}
                          ></span>
                          <div className="flex flex-col">
                            <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">
                              {source.name}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">
                              {source.percent}% ({source.count})
                            </span>
                          </div>
                        </div>
                      ))}
                      {leadSourceData.sources.length === 0 && (
                        <p className="text-xs text-slate-400">No data available</p>
                      )}
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
                {atRiskDeal ? (
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
                      {atRiskDeal.customer_name}
                    </h5>
                    <p className="text-[14px] text-slate-400 mb-6 leading-relaxed">
                      {atRiskDeal.reason || `No activity for ${atRiskDeal.days_since_activity} days. Competitive threat detected.`}
                    </p>
                    <Link href={`/crm/opportunities/${atRiskDeal.name}`}>
                      <button className="w-full py-4 bg-brand-yellow hover:bg-amber-400 text-slate-900 text-sm font-black rounded-xl transition-all shadow-lg shadow-amber-500/10 uppercase tracking-widest">
                        PRIORITY OUTREACH
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-emerald-500 text-xl">
                        check_circle
                      </span>
                      <span className="text-[12px] font-bold text-emerald-500 uppercase tracking-widest">
                        ALL DEALS ON TRACK
                      </span>
                    </div>
                    <p className="text-[14px] text-slate-400 leading-relaxed">
                      No at-risk deals detected. All opportunities are progressing well.
                    </p>
                  </div>
                )}
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                      RECOMMENDED ACTIONS
                    </p>
                    <Link href="/crm">
                      <button className="text-[11px] font-bold text-blue-400 uppercase tracking-widest hover:text-blue-300">
                        VIEW ALL
                      </button>
                    </Link>
                  </div>
                  {highProbOpportunities.slice(0, 2).map((opp, index) => {
                    const actionType = index === 0 ? "alternate_email" : "check_circle";
                    const actionColor = index === 0 ? "blue" : "emerald";
                    return (
                      <div
                        key={opp.name}
                        className="group flex items-center gap-5 p-5 bg-slate-800/40 rounded-2xl hover:bg-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-700"
                        onClick={() => router.push(`/crm/opportunities/${opp.name}`)}
                      >
                        <div
                          className={`w-12 h-12 bg-${actionColor}-500/10 text-${actionColor}-400 flex items-center justify-center rounded-full ring-1 ring-${actionColor}-500/30 group-hover:scale-105 transition-transform`}
                        >
                          <span className="material-symbols-outlined text-2xl font-bold">
                            {actionType}
                          </span>
                        </div>
                        <div>
                          <p className="text-[15px] font-bold text-white">
                            {index === 0 ? "Follow up - " : "Review - "}
                            {((opp.customer_name || opp.party_name) || "Unknown").split(" ")[0]}
                          </p>
                          <p className="text-[12px] text-slate-500">
                            {index === 0
                              ? "High velocity activity."
                              : "Contract review complete."}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Team Performance Section */}
          <div className="col-span-12">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-slate-400 text-2xl">
                history
              </span>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">
                Team Performance &amp; Intelligence
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-6">
              {activities.slice(0, 4).map((activity, index) => {
                const { icon, color, label } = getActivityIcon(activity.type);
                return (
                  <div
                    key={index}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 hover:shadow-md transition-shadow w-full"
                  >
                    <div className="flex items-center gap-4 mb-5">
                      <div className={`w-12 h-12 ${color} rounded-full flex items-center justify-center`}>
                        <span className="material-symbols-outlined font-bold text-xl">
                          {icon}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                          {label}
                        </p>
                        <h4 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                          {activity.owner}
                        </h4>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-col gap-1">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {activity.company}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                );
              })}
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
  );
}
