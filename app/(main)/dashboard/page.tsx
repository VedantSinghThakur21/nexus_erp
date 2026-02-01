
"use client"

import { useEffect, useMemo, useState } from "react";
import { getDashboardStats } from "@/app/actions/dashboard";
import { getOpportunities } from "@/app/actions/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, DollarSign, Target, Users, AlertCircle, Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    pipelineValue: 0,
    revenue: 0,
    openOpportunities: 0,
    winRate: 0,
    winRateChange: undefined,
    leadsChange: undefined,
    vsLastWeek: undefined,
  });
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("This Week");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getDashboardStats().catch(() => ({})),
      getOpportunities().catch(() => []),
    ]).then(([statsRes, oppsRes]) => {
      setStats(statsRes || {});
      setOpportunities(oppsRes || []);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-6">
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
          <Card className="border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600">WIN RATE</p>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-bold text-gray-900">{stats.winRate}%</h2>
                  {typeof stats.winRateChange === 'number' && (
                    <Badge className="bg-green-100 text-green-700 text-xs px-2 py-0.5">
                      {stats.winRateChange > 0 ? '+' : ''}{stats.winRateChange.toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <Progress value={stats.winRate} className="h-1.5 mt-3" />
                {typeof stats.vsLastWeek === 'number' && (
                  <p className="text-xs text-gray-500 mt-2">
                    {stats.vsLastWeek > 0 ? '+' : ''}{stats.vsLastWeek.toFixed(1)}% vs LW
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Value */}
          <Card className="border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600">PIPELINE VALUE</p>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-bold text-gray-900">
                    ${(stats.pipelineValue / 1000000).toFixed(1)}M
                  </h2>
                </div>
                <p className="text-xs text-gray-500 mt-2">Total opportunity value</p>
              </div>
            </CardContent>
          </Card>

          {/* Revenue MTD */}
          <Card className="border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600">REVENUE MTD</p>
                <Target className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-bold text-gray-900">
                    ${(revenueMTD / 1000000).toFixed(2)}M
                  </h2>
                </div>
                <p className="text-xs text-gray-500 mt-2">From invoices</p>
              </div>
            </CardContent>
          </Card>

          {/* Active Leads */}
          <Card className="border-gray-200 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600">ACTIVE LEADS</p>
                <Users className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-bold text-gray-900">{stats.openOpportunities}</h2>
                  {typeof stats.leadsChange === 'number' && (
                    <Badge className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5">
                      {stats.leadsChange > 0 ? '+' : ''}{stats.leadsChange.toFixed(1)}%
                    </Badge>
                  )}
                </div>
                {typeof stats.leadsChange === 'number' && (
                  <p className="text-xs text-gray-500 mt-2">vs last week</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row - Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* High-Probability Opportunities Table (2/3) */}
          <Card className="lg:col-span-2 border-gray-200 shadow-sm bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">High-Probability Opportunities</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">Full Pipeline <ChevronRight className="inline h-3 w-3" /></p>
                </div>
                <Link href="/crm/opportunities" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Full Pipeline →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 pb-3 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
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
                  highProbOpportunities.map((opp, idx) => (
                    <Link
                      key={idx}
                      href={`/crm/opportunities/${opp.name}`}
                      className="grid grid-cols-12 gap-4 items-center py-3 hover:bg-gray-50 rounded-lg px-2 transition-colors"
                    >
                      <div className="col-span-3">
                        <p className="font-medium text-gray-900 text-sm">{opp.customer_name || opp.party_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{opp.name}</p>
                      </div>
                      <div className="col-span-2">
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          {opp.sales_stage || 'Proposal'}
                        </Badge>
                      </div>
                      <div className="col-span-3">
                        <p className="font-semibold text-gray-900 text-sm">
                          ${(opp.opportunity_amount / 1000).toFixed(0)}K
                        </p>
                      </div>
                      <div className="col-span-4">
                        <div className="flex items-center gap-3">
                          <Progress value={opp.probability} className="h-2" />
                          <span className="text-sm font-medium text-gray-700 w-10">{opp.probability}%</span>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Intelligence Hub (1/3) */}
          <Card className="border-gray-200 shadow-sm bg-white">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Intelligence Hub</CardTitle>
                  <p className="text-xs text-green-600 font-medium mt-0.5">AI COPILOT ACTIVE</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* Deal at Risk Alert */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-900">DEAL AT RISK</p>
                    <p className="text-xs text-red-700 mt-1">Acme Corp HQ</p>
                    <p className="text-xs text-red-600 mt-2">Health score dropped to 42/100</p>
                    <button className="mt-3 text-xs font-semibold text-red-700 hover:text-red-900 bg-red-100 px-3 py-1.5 rounded-lg">
                      Generate Strategy
                    </button>
                  </div>
                </div>
              </div>

              {/* Priority Actions */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">PRIORITY ACTIONS</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Follow up: Velocity Tech</p>
                      <p className="text-xs text-gray-500">Proposal viewed 2x</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="h-2 w-2 rounded-full bg-green-600"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Executive Demo</p>
                      <p className="text-xs text-gray-500">Confirm: Stark Enterprises</p>
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
          <Card className="border-gray-200 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Stage Conversions</CardTitle>
              <p className="text-xs text-gray-500 mt-1">LEAD TO SQL</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Lead to SQL</p>
                  <div className="flex items-center gap-3 flex-1 max-w-xs">
                    <Progress value={34} className="h-2" />
                    <span className="text-sm font-semibold text-gray-900 w-10">34%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Proposal to Win</p>
                  <div className="flex items-center gap-3 flex-1 max-w-xs">
                    <Progress value={42} className="h-2" />
                    <span className="text-sm font-semibold text-gray-900 w-10">42%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Volume */}
          <Card className="border-gray-200 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Activity Volume</CardTitle>
              <p className="text-xs text-gray-500 mt-1">SYSTEMS OPERATIONAL</p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">Sales cycles shortening by 2-4 days this quarter</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
    pipelineValue: typeof stats.pipelineValue === 'number' ? stats.pipelineValue : 0,
    dealsWonMTD: typeof stats.dealsWonMTD === 'number' ? stats.dealsWonMTD : 0,
    winRate: typeof stats.winRate === 'number' ? stats.winRate : 0
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
                Overview
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm">Performance metrics and sales pipeline</p>
        </div>
        <div className="flex gap-2">
            <select className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm hover:shadow-md transition-shadow">
              <option>This Week</option>
              <option>This Month</option>
              <option>This Quarter</option>
            </select>
        </div>
      </div>

      {/* Performance Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        
        {/* New Leads Today */}
        <AnimatedStatCard
          title="New Leads Today"
          value={safeStats.newLeadsToday}
          change={{ value: 2, trend: 'up' }}
          icon={<Users className="h-5 w-5" />}
          delay={0}
        />

        {/* Open Opportunities */}
        <AnimatedStatCard
          title="Open Opportunities"
          value={safeStats.openOpportunities}
          change={{ value: 4, trend: 'up' }}
          icon={<Briefcase className="h-5 w-5" />}
          delay={0.1}
        />

        {/* Pipeline Value */}
        <AnimatedStatCard
          title="Pipeline Value"
          value={`₹${(safeStats.pipelineValue / 100000).toFixed(1)}L`}
          change={{ value: 10, trend: 'up' }}
          icon={<DollarSign className="h-5 w-5" />}
          variant="neon"
          delay={0.2}
        />

        {/* Deals Won MTD */}
        <AnimatedStatCard
          title="Deals Won MTD"
          value={safeStats.dealsWonMTD}
          icon={<Trophy className="h-5 w-5" />}
          delay={0.3}
        />

        {/* Win Rate % */}
        <AnimatedStatCard
          title="Win Rate %"
          value={`${safeStats.winRate}%`}
          change={{ value: 2, trend: 'up' }}
          icon={<Target className="h-5 w-5" />}
          delay={0.4}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Sales Pipeline Funnel */}
        <AnimatedCard className="lg:col-span-1" variant="glass" delay={0.5}>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Sales Pipeline Funnel</CardTitle>
            <p className="text-xs text-slate-500">₹{(safeStats.pipelineValue / 100000).toFixed(1)}L Potential Value</p>
          </CardHeader>
          <CardContent>
            <AnimatedFunnelChart data={safePipelineFunnel} delay={0.5} />
          </CardContent>
        </AnimatedCard>

        {/* Deals by Stage Bar Chart */}
        <AnimatedCard className="lg:col-span-1" variant="glass" delay={0.6}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Deals by Stage</CardTitle>
            <p className="text-xs text-slate-500">{safeStats.openOpportunities} Active Deals</p>
          </CardHeader>
          <CardContent className="pb-2">
            <AnimatedBarChart data={safeDealsByStage} height={200} delay={0.6} />
          </CardContent>
        </AnimatedCard>

        {/* Revenue Trend Area Chart */}
        <AnimatedCard className="lg:col-span-1" variant="glass" delay={0.7}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Revenue Trend</CardTitle>
            <p className="text-xs text-slate-500">Last 6 Months</p>
          </CardHeader>
          <CardContent className="pb-2">
            <AnimatedAreaChart data={safeRevenueData} height={200} delay={0.7} />
          </CardContent>
        </AnimatedCard>
      </div>

      {/* Tables Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* My Open Leads */}
        <AnimatedCard variant="glass" delay={0.8}>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">My Open Leads</CardTitle>
            <Link href="/crm">
              <AnimatedButton variant="ghost" size="sm" className="text-blue-600 p-0 h-auto">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </AnimatedButton>
            </Link>
          </CardHeader>
          <CardContent>
            {safeMyLeads.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No open leads</div>
            ) : (
              <AnimatedList>
                {safeMyLeads.map((lead, idx) => (
                  <AnimatedListItem key={idx} index={idx}>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-slate-900 dark:text-white">{lead.name}</p>
                        <p className="text-xs text-slate-500">{lead.company}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <AnimatedBadge variant="default" className="text-xs">{lead.status}</AnimatedBadge>
                        <span className="text-xs text-slate-400">{lead.lastContact}</span>
                      </div>
                    </div>
                  </AnimatedListItem>
                ))}
              </AnimatedList>
            )}
          </CardContent>
        </AnimatedCard>

        {/* My Open Opportunities */}
        <AnimatedCard variant="glass" delay={0.9}>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">My Open Opportunities</CardTitle>
            <Link href="/crm">
              <AnimatedButton variant="ghost" size="sm" className="text-blue-600 p-0 h-auto">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </AnimatedButton>
            </Link>
          </CardHeader>
          <CardContent>
            {safeMyOpportunities.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No open opportunities</div>
            ) : (
              <AnimatedList>
                {safeMyOpportunities.map((opp, idx) => (
                  <AnimatedListItem key={idx} index={idx}>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-slate-900 dark:text-white">{opp.name}</p>
                        <p className="text-xs text-slate-500">{opp.stage}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          ₹{(opp.value / 1000).toFixed(0)}K
                        </span>
                        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 transition-all duration-700" 
                            style={{ width: `${opp.probability}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </AnimatedListItem>
                ))}
              </AnimatedList>
            )}
          </CardContent>
        </AnimatedCard>
      </div>
    </div>
  )
}
