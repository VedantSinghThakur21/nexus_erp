"use client"

import { useEffect, useMemo, useState } from "react";
import type { Opportunity } from "@/app/actions/crm";
import { getDashboardStats } from "@/app/actions/dashboard";
import { getOpportunities } from "@/app/actions/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, DollarSign, Target, Users, AlertCircle, Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";

type Stats = {
  pipelineValue: number;
  revenue: number;
  openOpportunities: number;
  winRate: number;
  winRateChange?: number;
  leadsChange?: number;
};

function isStats(obj: any): obj is Stats {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.pipelineValue === "number" &&
    typeof obj.revenue === "number" &&
    typeof obj.openOpportunities === "number" &&
    typeof obj.winRate === "number"
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    pipelineValue: 0,
    revenue: 0,
    openOpportunities: 0,
    winRate: 0,
  });
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getDashboardStats().catch(() => ({})),
      getOpportunities().catch(() => []),
    ]).then(([statsRes, oppsRes]) => {
      setStats(
        isStats(statsRes)
          ? statsRes
          : { pipelineValue: 0, revenue: 0, openOpportunities: 0, winRate: 0 }
      );
      setOpportunities(oppsRes || []);
      setLoading(false);
    }).catch(() => {
      setError("Failed to load dashboard");
      setLoading(false);
    });
  }, []);

  const highProbOpportunities = useMemo(
    () => (opportunities || [])
      .filter((opp) => opp.probability >= 50 && opp.status === "Open")
      .slice(0, 4),
    [opportunities]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ============ DESKTOP LAYOUT (≥1280px): Grid with Main + Intelligence Hub ============ */}
      <div className="xl:grid xl:grid-cols-[1fr_360px] xl:gap-6 xl:p-6">
        
        {/* ============ MAIN CONTENT ============ */}
        <div className="space-y-6 p-6 xl:p-0">
          
          {/* KPI Cards - 4 columns on desktop, 2 on tablet, 1 on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            
            {/* WIN RATE */}
            <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">WIN RATE</p>
                  <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl font-bold text-gray-900">{stats.winRate.toFixed(1)}%</h2>
                  {stats.winRateChange && (
                    <Badge className="bg-green-50 text-green-700 border-0 text-xs px-2 py-0.5">
                      ↑{stats.winRateChange.toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <Progress value={stats.winRate} className="h-2" />
              </CardContent>
            </Card>

            {/* PIPELINE VALUE */}
            <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">PIPELINE VALUE</p>
                  <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <h2 className="text-3xl font-bold text-gray-900">
                  ${(stats.pipelineValue / 1000000).toFixed(1)}M
                </h2>
              </CardContent>
            </Card>

            {/* REVENUE MTD */}
            <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">REVENUE MTD</p>
                  <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <h2 className="text-3xl font-bold text-gray-900">
                  ${(stats.revenue / 1000000).toFixed(2)}M
                </h2>
                <div className="mt-3 h-8 flex gap-1">
                  {/* Mini bar chart */}
                  <div className="flex-1 bg-blue-600 rounded"></div>
                  <div className="flex-1 bg-blue-600 rounded"></div>
                  <div className="flex-1 bg-slate-300 rounded"></div>
                </div>
              </CardContent>
            </Card>

            {/* ACTIVE LEADS */}
            <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">ACTIVE LEADS</p>
                  <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl font-bold text-gray-900">
                    {stats.openOpportunities.toLocaleString()}
                  </h2>
                  {stats.leadsChange && (
                    <span className="text-xs text-green-600 font-bold">
                      +{stats.leadsChange}% VS LW
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* High-Probability Opportunities Table */}
          <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-gray-900">High-Probability Opportunities</CardTitle>
                <Link 
                  href="/crm/opportunities" 
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  Full Pipeline <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 pb-3 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                <div className="col-span-4">ACCOUNT</div>
                <div className="col-span-2">STAGE</div>
                <div className="col-span-3">VALUE</div>
                <div className="col-span-3">CONFIDENCE</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-gray-100">
                {highProbOpportunities.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">
                    No high-probability opportunities
                  </div>
                ) : (
                  highProbOpportunities.map((opp, idx) => {
                    const stageColors: Record<string, string> = {
                      'Proposal': 'bg-blue-50 text-blue-700 border-blue-200',
                      'Discovery': 'bg-purple-50 text-purple-700 border-purple-200',
                      'Negotiation': 'bg-orange-50 text-orange-700 border-orange-200',
                      'Closed': 'bg-green-50 text-green-700 border-green-200',
                    };
                    const stageClass = stageColors[opp.sales_stage] || 'bg-slate-50 text-slate-700 border-slate-200';
                    
                    return (
                      <Link
                        key={idx}
                        href={`/crm/opportunities/${opp.name}`}
                        className="grid grid-cols-12 gap-4 items-center py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="col-span-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-slate-600">
                                {(opp.customer_name || opp.party_name || '?').substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <p className="font-semibold text-gray-900 text-sm truncate">
                              {opp.customer_name || opp.party_name}
                            </p>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Badge className={`${stageClass} text-xs font-medium px-2.5 py-1 border`}>
                            {opp.sales_stage || 'Proposal'}
                          </Badge>
                        </div>
                        <div className="col-span-3">
                          <p className="font-bold text-gray-900">${(opp.opportunity_amount / 1000).toFixed(0)}K</p>
                        </div>
                        <div className="col-span-3">
                          <div className="flex items-center gap-3">
                            <Progress value={opp.probability} className="h-2 flex-1" />
                            <span className="text-sm font-bold text-gray-700 min-w-[38px]">
                              {opp.probability}%
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bottom Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* REVENUE FORECAST */}
            <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold text-gray-900">REVENUE FORECAST</CardTitle>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-0.5 w-6 bg-blue-600"></div>
                        <span className="text-gray-600">ACTUAL</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-0.5 w-6 bg-blue-400 border-t-2 border-dashed"></div>
                        <span className="text-gray-600">AI PATH</span>
                      </div>
                    </div>
                  </div>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-40 relative">
                  <svg className="w-full h-full" viewBox="0 0 400 140" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    
                    {/* Grid */}
                    <line x1="0" y1="35" x2="400" y2="35" stroke="#E5E7EB" strokeWidth="1" />
                    <line x1="0" y1="70" x2="400" y2="70" stroke="#E5E7EB" strokeWidth="1" />
                    <line x1="0" y1="105" x2="400" y2="105" stroke="#E5E7EB" strokeWidth="1" />
                    
                    {/* Area fill */}
                    <path
                      d="M0,120 L50,110 L100,95 L150,85 L200,70 L250,60 L300,50 L300,140 L0,140 Z"
                      fill="url(#gradient)"
                    />
                    
                    {/* Actual line */}
                    <path
                      d="M0,120 L50,110 L100,95 L150,85 L200,70 L250,60 L300,50"
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Forecast dashed */}
                    <path
                      d="M300,50 L350,35 L400,20"
                      fill="none"
                      stroke="#60A5FA"
                      strokeWidth="2"
                      strokeDasharray="6,4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="flex justify-between mt-2 text-xs text-gray-500 font-medium">
                    <span>WEEK 1</span>
                    <span>WEEK 4 (EST)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ACTIVITY VOLUME */}
            <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold text-gray-900">ACTIVITY VOLUME</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40 flex items-end justify-around gap-3">
                  {[
                    { day: 'M', height: 45 },
                    { day: 'T', height: 60 },
                    { day: 'W', height: 95 },
                    { day: 'T', height: 50 },
                    { day: 'F', height: 35 },
                    { day: 'S', height: 25 },
                  ].map((bar, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-blue-600 rounded-t-md"
                        style={{ height: `${bar.height}%` }}
                      ></div>
                      <span className="text-xs font-medium text-gray-600">{bar.day}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold text-green-600">↑14%</span> Sales cycles shortening by 2-4 days this quarter
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* REAL-TIME REVENUE ACTIVITY */}
          <Card className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <CardTitle className="text-base font-bold text-gray-900">REAL-TIME REVENUE ACTIVITY</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* CLOSED: WON */}
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <div className="h-6 w-6 rounded-full bg-green-600 flex items-center justify-center">
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-green-700 uppercase tracking-wide">CLOSED: WON</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">Sarah Jenkins</p>
                    <p className="text-xs text-gray-600 mt-0.5">Cyberdyne Corp • $85k</p>
                    <p className="text-xs text-gray-400 mt-1">2 MIN AGO</p>
                  </div>
                </div>

                {/* HOT PROSPECT */}
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">HOT PROSPECT</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">Mike Rossi</p>
                    <p className="text-xs text-gray-600 mt-0.5">TechFlow Systems</p>
                    <p className="text-xs text-gray-400 mt-1">16 MIN AGO</p>
                  </div>
                </div>

                {/* ENGAGEMENT */}
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                    <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">ENGAGEMENT</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">David Geller</p>
                    <p className="text-xs text-gray-600 mt-0.5">Stark Inc • Proposal Opened</p>
                    <p className="text-xs text-gray-400 mt-1">43 MIN AGO</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  <span className="font-bold text-slate-700">SYSTEMS OPERATIONAL</span> • v4.2.0 Enterprise Ultimate
                </p>
                <div className="flex items-center gap-6 text-xs text-blue-600 font-medium">
                  <button className="hover:text-blue-700">API DOCS</button>
                  <button className="hover:text-blue-700">SUPPORT HUB</button>
                  <button className="hover:text-blue-700">TERMS OF SERVICE</button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ============ INTELLIGENCE HUB (Desktop: right sidebar, Tablet/Mobile: below) ============ */}
        <div className="p-6 xl:p-0 space-y-6">
          
          <Card className="rounded-xl border border-gray-200 bg-white shadow-sm xl:sticky xl:top-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <div className="flex-1">
                  <CardTitle className="text-base font-bold text-gray-900">Intelligence Hub</CardTitle>
                  <p className="text-[10px] font-bold text-green-600 mt-0.5 uppercase tracking-wider">AI COPILOT ACTIVE</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* DEAL AT RISK Alert */}
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-400 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-700 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-yellow-900 uppercase tracking-wide">⚠ DEAL AT RISK</p>
                    <p className="text-base font-bold text-gray-900 mt-2">Acme Corp HQ</p>
                    <p className="text-sm text-gray-700 mt-1.5">
                      Health score dropped to <span className="font-bold text-red-600">42/100</span>.
                    </p>
                    <button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 px-4 rounded-lg transition-colors">
                      Generate Strategy
                    </button>
                  </div>
                </div>
              </div>

              {/* PRIORITY ACTIONS */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">PRIORITY ACTIONS</h4>
                <div className="space-y-3">
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1.5"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Follow up: Velocity</p>
                      <p className="text-xs text-gray-600 mt-0.5">Proposal viewed 3x, 2d Ent</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="h-2 w-2 rounded-full bg-green-600 shrink-0 mt-1.5"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Executive Demo</p>
                      <p className="text-xs text-gray-600 mt-0.5">Confirm: Stark Ent</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="h-2 w-2 rounded-full bg-orange-600 shrink-0 mt-1.5"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Update Pricing</p>
                      <p className="text-xs text-gray-600 mt-0.5">CloudSphere request</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* MARKET INSIGHT */}
              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">MARKET INSIGHT</h4>
                <div className="flex items-start gap-2">
                  <span className="text-base font-bold text-green-600">+14%</span>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    "Sales cycles shortening by 2-4 days this quarter due to AI-driven outreach."
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
