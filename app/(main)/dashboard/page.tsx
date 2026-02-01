
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
import { TrendingUp, DollarSign, Target, Users, AlertCircle, Sparkles, ChevronRight } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">{formattedDate}</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="text-sm border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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

      <div className="p-8 max-w-[1800px] mx-auto space-y-6">
        {/* Top Row - 4 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Win Rate */}
          <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">WIN RATE</p>
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-bold text-gray-900">{stats.winRate}%</h2>
                  {typeof stats.winRateChange === 'number' && (
                    <Badge className="bg-green-100 text-green-600 text-xs px-2 py-1 font-semibold border-0">
                      {stats.winRateChange > 0 ? '↑' : '↓'}{Math.abs(stats.winRateChange).toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <Progress value={stats.winRate} className="h-2 bg-gray-200" />
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Value */}
          <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">PIPELINE VALUE</p>
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <h2 className="text-4xl font-bold text-gray-900">
                  ${(stats.pipelineValue / 1000000).toFixed(1)}M
                </h2>
              </div>
            </CardContent>
          </Card>

          {/* Revenue MTD */}
          <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">REVENUE MTD</p>
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Target className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <h2 className="text-4xl font-bold text-gray-900">
                  ${(revenueMTD / 1000000).toFixed(2)}M
                </h2>
              </div>
            </CardContent>
          </Card>

          {/* Active Leads */}
          <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ACTIVE LEADS</p>
                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <Users className="h-4 w-4 text-orange-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-bold text-gray-900">{stats.openOpportunities}</h2>
                </div>
                {typeof stats.leadsChange === 'number' && (
                  <p className="text-xs text-gray-600 font-medium mt-2">
                    {stats.leadsChange > 0 ? '+' : ''}{stats.leadsChange.toFixed(1)}% vs LW
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row - Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* High-Probability Opportunities Table (2/3) */}
          <Card className="lg:col-span-2 border-0 shadow-md bg-white hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900">High-Probability Opportunities</CardTitle>
                  <Link href="/crm/opportunities" className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-1 inline-flex items-center">
                    Full Pipeline <ChevronRight className="h-3 w-3 ml-1" />
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 pb-3 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
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
                      'Proposal': 'bg-blue-100 text-blue-700',
                      'Prospecting': 'bg-blue-100 text-blue-700',
                      'Qualification': 'bg-purple-100 text-purple-700',
                      'Quotation': 'bg-indigo-100 text-indigo-700',
                      'Negotiation': 'bg-amber-100 text-amber-700',
                    };
                    const stageClass = stageColors[opp.sales_stage] || 'bg-blue-100 text-blue-700';
                    return (
                      <Link
                        key={idx}
                        href={`/crm/opportunities/${opp.name}`}
                        className="grid grid-cols-12 gap-4 items-center py-4 hover:bg-blue-50/50 rounded-lg px-3 transition-all border border-transparent hover:border-blue-200"
                      >
                        <div className="col-span-3">
                          <p className="font-semibold text-gray-900 text-sm">{opp.customer_name || opp.party_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{opp.name}</p>
                        </div>
                        <div className="col-span-2">
                          <Badge className={`${stageClass} text-xs font-semibold px-2.5 py-1 border-0`}>
                            {opp.sales_stage || 'Proposal'}
                          </Badge>
                        </div>
                        <div className="col-span-3">
                          <p className="font-bold text-gray-900 text-sm">
                            ${(opp.opportunity_amount / 1000).toFixed(0)}K
                          </p>
                        </div>
                        <div className="col-span-4">
                          <div className="flex items-center gap-3">
                            <Progress value={opp.probability} className="h-2.5 bg-gray-200" />
                            <span className="text-sm font-bold text-gray-700 min-w-[40px]">{opp.probability}%</span>
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
          <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900">Intelligence Hub</CardTitle>
                  <p className="text-xs text-green-600 font-bold mt-0.5 uppercase tracking-wide">AI COPILOT ACTIVE</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Deal at Risk Alert */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-900 uppercase tracking-wide">DEAL AT RISK</p>
                    <p className="text-sm font-semibold text-gray-900 mt-2">Acme Corp HQ</p>
                    <p className="text-xs text-gray-700 mt-1.5">Health score dropped to <span className="font-bold text-red-600">42/100</span></p>
                    <button className="mt-4 w-full text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all">
                      Generate Strategy
                    </button>
                  </div>
                </div>
              </div>

              {/* Priority Actions */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">PRIORITY ACTIONS</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors border border-blue-200">
                    <div className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Follow up: Velocity Tech</p>
                      <p className="text-xs text-gray-600 mt-0.5">Proposal viewed 2x</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 hover:bg-green-100 cursor-pointer transition-colors border border-green-200">
                    <div className="h-2 w-2 rounded-full bg-green-600 shrink-0 mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Executive Demo</p>
                      <p className="text-xs text-gray-600 mt-0.5">Confirm: Stark Enterprises</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row - Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Stage Conversions */}
          <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-900">Stage Conversions</CardTitle>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide font-semibold">LEAD TO SQL</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700 w-32">Lead to SQL</p>
                  <div className="flex items-center gap-3 flex-1">
                    <Progress value={34} className="h-2.5 bg-gray-200" />
                    <span className="text-sm font-bold text-gray-900 min-w-[40px]">34%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700 w-32">Proposal to Win</p>
                  <div className="flex items-center gap-3 flex-1">
                    <Progress value={42} className="h-2.5 bg-gray-200" />
                    <span className="text-sm font-bold text-gray-900 min-w-[40px]">42%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Volume */}
          <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-900">Activity Volume</CardTitle>
              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide font-semibold">SYSTEMS OPERATIONAL</p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-sm font-medium text-gray-600">Sales cycles shortening by <span className="font-bold text-green-600">2-4 days</span> this quarter</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
