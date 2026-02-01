
"use client"

// Stats type and type guard
type Stats = {
  pipelineValue: number;
  revenue: number;
  openOpportunities: number;
  winRate: number;
  winRateChange?: number;
  leadsChange?: number;
  vsLastWeek?: number;
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

import { useEffect, useMemo, useState } from "react";
import type { Opportunity } from "@/app/actions/crm";
import { getDashboardStats } from "@/app/actions/dashboard";
import { getOpportunities } from "@/app/actions/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, DollarSign, Target, Users, AlertCircle, Sparkles, ChevronRight, Calendar } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    pipelineValue: 0,
    revenue: 0,
    openOpportunities: 0,
    winRate: 0,
    winRateChange: undefined,
    leadsChange: undefined,
    vsLastWeek: undefined,
  });
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState("This Week");

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getDashboardStats().catch((err) => {
        setError(`Failed to load stats: ${err.message}`);
        return {};
      }),
      getOpportunities().catch((err) => {
        setError(`Failed to load opportunities: ${err.message}`);
        return [];
      }),
    ]).then(([statsRes, oppsRes]) => {
      setStats(
        isStats(statsRes)
          ? statsRes
          : {
              pipelineValue: 0,
              revenue: 0,
              openOpportunities: 0,
              winRate: 0,
              winRateChange: undefined,
              leadsChange: undefined,
              vsLastWeek: undefined,
            }
      );
      setOpportunities(oppsRes || []);
      setLoading(false);
    }).catch((err) => {
      setError(`Unexpected error: ${err.message}`);
      setLoading(false);
    });
  }, [timeframe]);

  // Filter high-probability opportunities (>50%)
  const highProbOpportunities = useMemo(
    () => (opportunities || [])
      .filter((opp) => opp.probability >= 50 && opp.status === "Open")
      .slice(0, 3),
    [opportunities]
  );

  // Calculate revenue MTD from stats
  const revenueMTD = stats.revenue || 0;

  // Format date
  const today = new Date();
  const formattedDate = today.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md border-l-4 border-red-500">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF2F6]">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">{formattedDate}</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <option>This Week</option>
              <option>This Month</option>
              <option>This Quarter</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-[1800px] mx-auto space-y-5">
        {/* Top Row - 4 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Win Rate */}
          <Card className="border border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600 uppercase">WIN RATE</p>
                <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-3xl font-bold text-gray-900">{stats.winRate}%</h2>
                  {typeof stats.winRateChange === 'number' && (
                    <Badge className="bg-green-50 text-green-600 text-xs px-2 py-0.5 font-semibold border-0">
                      ↑{Math.abs(stats.winRateChange).toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <Progress value={stats.winRate} className="h-1.5 bg-gray-200" />
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Value */}
          <Card className="border border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600 uppercase">PIPELINE VALUE</p>
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <h2 className="text-3xl font-bold text-gray-900">
                ${(stats.pipelineValue / 1000000).toFixed(1)}M
              </h2>
            </CardContent>
          </Card>

          {/* Revenue MTD */}
          <Card className="border border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600 uppercase">REVENUE MTD</p>
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Target className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <h2 className="text-3xl font-bold text-gray-900">
                ${(revenueMTD / 1000000).toFixed(2)}M
              </h2>
            </CardContent>
          </Card>

          {/* Active Leads */}
          <Card className="border border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600 uppercase">ACTIVE LEADS</p>
                <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Users className="h-4 w-4 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-baseline gap-2">
                <h2 className="text-3xl font-bold text-gray-900">{stats.openOpportunities}</h2>
                {typeof stats.leadsChange === 'number' && (
                  <p className="text-xs text-green-600 font-semibold">
                    +{stats.leadsChange.toFixed(0)}% vs LW
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row - Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* High-Probability Opportunities Table (2/3) */}
          <Card className="lg:col-span-2 border border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-gray-900">High-Probability Opportunities</CardTitle>
                <Link href="/crm/opportunities" className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center">
                  Full Pipeline <ChevronRight className="h-3 w-3 ml-0.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 pb-2 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                  <div className="col-span-3">ACCOUNT</div>
                  <div className="col-span-2">STAGE</div>
                  <div className="col-span-3">VALUE</div>
                  <div className="col-span-4">CONFIDENCE</div>
                </div>

                {/* Table Rows */}
                {highProbOpportunities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No high-probability opportunities found
                  </div>
                ) : (
                  highProbOpportunities.map((opp, idx) => {
                    const stageColors: Record<string, string> = {
                      'Proposal': 'bg-blue-50 text-blue-700',
                      'Prospecting': 'bg-blue-50 text-blue-700',
                      'Qualification': 'bg-purple-50 text-purple-700',
                      'Quotation': 'bg-indigo-50 text-indigo-700',
                      'Negotiation': 'bg-orange-50 text-orange-700',
                    };
                    const stageClass = stageColors[opp.sales_stage] || 'bg-blue-50 text-blue-700';
                    return (
                      <Link
                        key={idx}
                        href={`/crm/opportunities/${opp.name}`}
                        className="grid grid-cols-12 gap-4 items-center py-3 hover:bg-gray-50 rounded-md px-2 transition-colors"
                      >
                        <div className="col-span-3">
                          <p className="font-semibold text-gray-900 text-sm">{opp.customer_name || opp.party_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{opp.name}</p>
                        </div>
                        <div className="col-span-2">
                          <Badge className={`${stageClass} text-xs font-medium px-2 py-0.5 border-0`}>
                            {opp.sales_stage || 'Proposal'}
                          </Badge>
                        </div>
                        <div className="col-span-3">
                          <p className="font-bold text-gray-900 text-sm">
                            ${(opp.opportunity_amount / 1000).toFixed(0)}K
                          </p>
                        </div>
                        <div className="col-span-4">
                          <div className="flex items-center gap-2">
                            <Progress value={opp.probability} className="h-2 bg-gray-200" />
                            <span className="text-sm font-semibold text-gray-700 min-w-[35px]">{opp.probability}%</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Intelligence Hub (1/3) */}
          <Card className="border border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <div>
                  <CardTitle className="text-base font-bold text-gray-900">Intelligence Hub</CardTitle>
                  <p className="text-[10px] text-green-600 font-bold mt-0.5 uppercase">AI COPILOT ACTIVE</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              
              {/* Deal at Risk Alert */}
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-700 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-yellow-900 uppercase">DEAL AT RISK</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1.5">Acme Corp HQ</p>
                    <p className="text-xs text-gray-700 mt-1">Health score dropped to <span className="font-bold text-red-600">42/100</span></p>
                    <button className="mt-3 w-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md transition-colors">
                      Generate Strategy
                    </button>
                  </div>
                </div>
              </div>

              {/* Priority Actions */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-500 mb-2 uppercase">PRIORITY ACTIONS</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-blue-50 border border-blue-200">
                    <div className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">Follow up: Velocity Tech</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">Proposal viewed 2x</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-md bg-green-50 border border-green-200">
                    <div className="h-2 w-2 rounded-full bg-green-600 shrink-0 mt-1"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">Executive Demo</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">Confirm: Stark Enterprises</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row - Charts and Team Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Revenue Forecast */}
          <Card className="border border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-gray-900">Revenue Forecast</CardTitle>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-0.5 bg-blue-600"></div>
                      <span className="text-gray-600">ACTUAL</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-0.5 bg-blue-400 border-t-2 border-dashed border-blue-400"></div>
                      <span className="text-gray-600">AI PATH</span>
                    </div>
                  </div>
                </div>
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-40 relative">
                {/* Simple Revenue Trend Line Chart */}
                <svg className="w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="40" x2="400" y2="40" stroke="#E5E7EB" strokeWidth="1" />
                  <line x1="0" y1="80" x2="400" y2="80" stroke="#E5E7EB" strokeWidth="1" />
                  <line x1="0" y1="120" x2="400" y2="120" stroke="#E5E7EB" strokeWidth="1" />
                  
                  {/* Actual revenue line */}
                  <path
                    d="M 0,130 L 50,125 L 100,115 L 150,110 L 200,100 L 250,95 L 300,90"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  
                  {/* Fill area under actual line */}
                  <path
                    d="M 0,130 L 50,125 L 100,115 L 150,110 L 200,100 L 250,95 L 300,90 L 300,160 L 0,160 Z"
                    fill="url(#blueGradient)"
                    opacity="0.2"
                  />
                  
                  {/* Forecast dashed line */}
                  <path
                    d="M 300,90 L 350,70 L 400,50"
                    fill="none"
                    stroke="#60A5FA"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    strokeLinecap="round"
                  />
                  
                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                
                {/* Week labels */}
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>WEEK 1</span>
                  <span>WEEK 4 (EST)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Volume */}
          <Card className="border border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-gray-900">Activity Volume</CardTitle>
              <p className="text-[10px] text-gray-500 mt-1 uppercase font-semibold">SYSTEMS OPERATIONAL</p>
            </CardHeader>
            <CardContent>
              <div className="h-40 relative flex items-end justify-around gap-2 pb-6">
                {/* Bar chart */}
                {[
                  { day: 'M', height: 40, value: 120 },
                  { day: 'T', height: 55, value: 180 },
                  { day: 'W', height: 85, value: 285 },
                  { day: 'T', height: 45, value: 145 },
                  { day: 'F', height: 30, value: 95 },
                  { day: 'S', height: 20, value: 60 },
                ].map((bar, idx) => (
                  <div key={idx} className="flex flex-col items-center flex-1">
                    <div 
                      className="w-full bg-blue-600 rounded-t-sm transition-all hover:bg-blue-700"
                      style={{ height: `${bar.height}%` }}
                    ></div>
                    <span className="text-xs text-gray-600 mt-2">{bar.day}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-600">
                  <span className="font-semibold text-green-600">Sales cycles shortening by 2-4 days</span> this quarter
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Performance & Intelligence */}
        <Card className="border border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-base font-bold text-gray-900">Team Performance & Intelligence</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Closed Deal */}
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <div className="h-5 w-5 rounded-full bg-green-600 flex items-center justify-center">
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-800 uppercase">CLOSED DEAL</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">Sarah Jenkins</p>
                  <p className="text-xs text-gray-600 mt-0.5">Cyberdyne Corp</p>
                  <p className="text-xs text-gray-500 mt-1">2 MINUTES AGO</p>
                </div>
              </div>

              {/* New Lead */}
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-800 uppercase">NEW LEAD</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">Mike Rossi</p>
                  <p className="text-xs text-gray-600 mt-0.5">TechFlow Systems</p>
                  <p className="text-xs text-gray-500 mt-1">15 MINUTES AGO</p>
                </div>
              </div>

              {/* Outbound */}
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-purple-800 uppercase">OUTBOUND</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">David Geller</p>
                  <p className="text-xs text-gray-600 mt-0.5">Stark Industries</p>
                  <p className="text-xs text-gray-500 mt-1">45 MINUTES AGO</p>
                </div>
              </div>

              {/* Meeting Set */}
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-yellow-800 uppercase">MEETING SET</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">Amy Pond</p>
                  <p className="text-xs text-gray-600 mt-0.5">Waltham Co.</p>
                  <p className="text-xs text-gray-500 mt-1">1 HOUR AGO</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
