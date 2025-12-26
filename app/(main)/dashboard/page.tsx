import { getDashboardStats, getSalesPipelineFunnel, getDealsByStage, getMyOpenLeads, getMyOpenOpportunities } from "@/app/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AnimatedStatCard, AnimatedCard, AnimatedButton, AnimatedBadge, AnimatedList, AnimatedListItem } from "@/components/ui/animated"
import { AnimatedAreaChart, AnimatedBarChart, AnimatedFunnelChart } from "@/components/dashboard/animated-charts"
import { TrendingUp, TrendingDown, Users, Briefcase, DollarSign, Target, Trophy, ArrowRight } from "lucide-react"
import Link from "next/link"
import { frappeRequest } from "@/app/lib/api"

// Helper to get user name
async function getUser() {
  try {
    const userEmail = await frappeRequest('frappe.auth.get_logged_user')
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
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Deals by Stage</CardTitle>
            <p className="text-xs text-slate-500">{safeStats.openOpportunities} Active Deals</p>
          </CardHeader>
          <CardContent>
            <AnimatedBarChart data={safeDealsByStage} height={200} delay={0.6} />
          </CardContent>
        </AnimatedCard>

        {/* Revenue Trend Area Chart */}
        <AnimatedCard className="lg:col-span-1" variant="glass" delay={0.7}>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Revenue Trend</CardTitle>
            <p className="text-xs text-slate-500">Last 6 Months</p>
          </CardHeader>
          <CardContent>
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
