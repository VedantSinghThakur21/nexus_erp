import { getDashboardStats, getSalesPipelineFunnel, getDealsByStage, getMyOpenLeads, getMyOpenOpportunities } from "@/app/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AnimatedStatCard, AnimatedCard, AnimatedButton, AnimatedBadge, AnimatedList, AnimatedListItem } from "@/components/ui/animated"
import { AnimatedAreaChart, AnimatedBarChart, AnimatedFunnelChart } from "@/components/dashboard/animated-charts"
import { TrendingUp, TrendingDown, Users, Briefcase, DollarSign, Target, Trophy, ArrowRight, Plus } from "lucide-react"
import Link from "next/link"
import { frappeRequest } from "@/app/lib/api"

// Helper to get user name
async function getUser() {
  try {
    const userEmail = await frappeRequest('frappe.auth.get_logged_user')
    // Fetch full user details using the REST API directly
    const userRes = await fetch(`${process.env.ERP_NEXT_URL}/api/resource/User/${userEmail}`, {
       headers: { 
         'Authorization': `token ${process.env.ERP_API_KEY}:${process.env.ERP_API_SECRET}` 
       },
       cache: 'no-store'
    })
    const userData = await userRes.json()
    return userData.data || { full_name: 'User' }
  } catch (e) {
    return { full_name: 'User' }
  }
}

// Get Revenue Trend (Last 6 Months)
async function getRevenueData() {
    try {
        const invoices = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Sales Invoice',
            fields: '["grand_total", "posting_date"]',
            filters: '[["docstatus", "=", 1]]',
            order_by: 'posting_date asc',
            limit_page_length: 1000
        });

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const now = new Date();
        const last6Months = [];
        
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            last6Months.push(months[d.getMonth()]);
        }

        const monthlyData: Record<string, number> = {};
        last6Months.forEach(month => monthlyData[month] = 0);
        
        invoices.forEach((inv: any) => {
            const date = new Date(inv.posting_date);
            const month = months[date.getMonth()];
            if (monthlyData.hasOwnProperty(month)) {
                monthlyData[month] += inv.grand_total;
            }
        });

        return last6Months.map(key => ({
            name: key,
            total: Math.round(monthlyData[key])
        }));
    } catch (e) {
        return [];
    }
}

export default async function DashboardPage() {
  const user = await getUser()
  const stats = await getDashboardStats()
  const pipelineFunnel = await getSalesPipelineFunnel()
  const dealsByStage = await getDealsByStage()
  const revenueData = await getRevenueData()
  const myLeads = await getMyOpenLeads()
  const myOpportunities = await getMyOpenOpportunities()

  // Safe validation - ensure all data is arrays/objects, not error objects
  const safePipelineFunnel = Array.isArray(pipelineFunnel) ? pipelineFunnel : []
  const safeDealsByStage = Array.isArray(dealsByStage) ? dealsByStage : []
  const safeRevenueData = Array.isArray(revenueData) ? revenueData : []
  const safeMyLeads = Array.isArray(myLeads) ? myLeads : []
  const safeMyOpportunities = Array.isArray(myOpportunities) ? myOpportunities : []
  
  const safeStats = {
    newLeadsToday: typeof stats.newLeadsToday === 'number' ? stats.newLeadsToday : 0,
    openOpportunities: typeof stats.openOpportunities === 'number' ? stats.openOpportunities : 0,
    pipelineValue: typeof stats.pipelineValue === 'number' ? stats.pipelineValue : 0,
    dealsWonMTD: typeof stats.dealsWonMTD === 'number' ? stats.dealsWonMTD : 0,
    winRate: typeof stats.winRate === 'number' ? stats.winRate : 0
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">Overview of key metrics and daily operations</p>
        </div>
        <div className="flex gap-2">
            <AnimatedButton variant="outline" className="gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Customize
            </AnimatedButton>
            <AnimatedButton variant="neon" className="gap-2">
              <Plus className="h-4 w-4" /> Create New
            </AnimatedButton>
        </div>
      </div>

      {/* Performance Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Total Revenue */}
        <AnimatedStatCard
          title="Total Revenue (MTD)"
          value={`₹${(safeStats.pipelineValue / 1000).toFixed(0)}K`}
          change={{ value: 12, trend: 'up' }}
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
          delay={0}
        />

        {/* Open Leads */}
        <AnimatedStatCard
          title="Open Leads"
          value={safeStats.openOpportunities}
          change={{ value: 5, trend: 'up' }}
          icon={<Users className="h-5 w-5 text-blue-600" />}
          delay={0.1}
        />

        {/* Pending Tasks */}
        <AnimatedStatCard
          title="Won Deals (MTD)"
          value={safeStats.dealsWonMTD}
          change={{ value: 8, trend: 'up' }}
          icon={<Trophy className="h-5 w-5 text-purple-600" />}
          delay={0.2}
        />

        {/* Win Rate */}
        <AnimatedStatCard
          title="Win Rate"
          value={`${safeStats.winRate}%`}
          icon={<Target className="h-5 w-5 text-green-600" />}
          delay={0.3}
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Sales Pipeline Funnel */}
        <AnimatedCard className="lg:col-span-1" variant="glass" delay={0.5}>
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base font-semibold">Sales Pipeline Funnel</CardTitle>
                <p className="text-xs text-slate-500 mt-1">Conversion from Lead to Order</p>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {safePipelineFunnel.map((stage, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{stage.stage}</span>
                    <span className="text-slate-900 dark:text-white font-semibold">{stage.count}</span>
                  </div>
                  <div className="h-8 bg-gradient-to-r from-blue-500 to-blue-400 rounded-lg flex items-center px-3 text-white text-xs font-medium"
                       style={{ width: `${Math.max((stage.count / (safePipelineFunnel[0]?.count || 1)) * 100, 15)}%` }}>
                    {stage.value ? `₹${(stage.value / 100000).toFixed(1)}L` : ''}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Deals By Stage */}
        <AnimatedCard className="lg:col-span-1" variant="glass" delay={0.6}>
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base font-semibold">Deals By Stage</CardTitle>
                <p className="text-xs text-slate-500 mt-1">Distribution across pipeline</p>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {safeDealsByStage.map((stage, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{stage.stage}</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{stage.count}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-2.5 rounded-full" style={{ width: `${Math.max((stage.count / Math.max(...safeDealsByStage.map(s => s.count), 1)) * 100, 5)}%` }}></div>
                  </div>
                </div>
              ))}
              {safeDealsByStage.length === 0 && (
                <div className="text-center py-8 text-sm text-slate-400">
                  No deals data available
                </div>
              )}
            </div>
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
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-4 pb-2 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400">
                <div>LEAD</div>
                <div>COMPANY</div>
                <div>STATUS</div>
                <div>SCORE</div>
              </div>
              {safeMyLeads.slice(0, 5).map((lead: any, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-4 py-3 text-sm items-center hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors">
                  <div className="font-medium text-slate-900 dark:text-white truncate">{lead.lead_name || 'N/A'}</div>
                  <div className="text-slate-700 dark:text-slate-300 truncate">{lead.company_name || 'N/A'}</div>
                  <div>
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium border bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300">
                      {lead.status || 'Lead'}
                    </span>
                  </div>
                  <div className="text-slate-900 dark:text-white font-semibold">{Math.floor(Math.random() * 30 + 70)}</div>
                </div>
              ))}
              {safeMyLeads.length === 0 && (
                <div className="text-center py-8 text-sm text-slate-400">
                  No leads available
                </div>
              )}
            </div>
          </CardContent>
        </AnimatedCard>

        {/* My Opportunities */}
        <AnimatedCard variant="glass" delay={0.9}>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">My Opportunities</CardTitle>
            <Link href="/crm">
              <AnimatedButton variant="ghost" size="sm" className="text-blue-600 p-0 h-auto">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </AnimatedButton>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {safeMyOpportunities.slice(0, 4).map((opp: any, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 flex items-start gap-3 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="mt-0.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                      {opp.party_name?.charAt(0) || '?'}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{opp.party_name || 'Unknown'}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate">{opp.opportunity_from || 'N/A'} • {opp.status || 'Open'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">₹{((opp.opportunity_amount || 0) / 1000).toFixed(0)}K</p>
                  </div>
                </div>
              ))}
              {safeMyOpportunities.length === 0 && (
                <div className="text-center py-8 text-sm text-slate-400">
                  No opportunities available
                </div>
              )}
            </div>
          </CardContent>
        </AnimatedCard>
      </div>
    </div>
  )
}
