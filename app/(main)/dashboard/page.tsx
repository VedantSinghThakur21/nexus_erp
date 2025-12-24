import { getDashboardStats, getSalesPipelineFunnel, getDealsByStage, getMyOpenLeads, getMyOpenOpportunities } from "@/app/actions/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AnimatedStatCard, AnimatedCard, AnimatedButton, AnimatedBadge, AnimatedList, AnimatedListItem } from "@/components/ui/animated"
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
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Overview
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Performance metrics and sales pipeline</p>
        </div>
        <div className="flex gap-2">
            <select className="text-sm border rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900">
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
            <div className="space-y-3 py-2">
              {safePipelineFunnel.map((stage, idx) => {
                const maxValue = safePipelineFunnel[0]?.value || 1
                const width = maxValue > 0 ? (stage.value / maxValue) * 100 : 0
                const isLast = idx === safePipelineFunnel.length - 1
                
                // Color gradient from blue to green
                const colors = [
                  'bg-blue-500',
                  'bg-blue-400', 
                  'bg-cyan-400',
                  'bg-teal-400',
                  'bg-green-500'
                ]
                const color = colors[idx] || 'bg-blue-500'
                
                return (
                  <div key={stage.stage} className="flex flex-col items-center gap-1">
                    <div className="w-full flex justify-center">
                      <div 
                        className={`${color} transition-all relative`}
                        style={{ 
                          width: `${Math.max(width, 70)}%`,
                          clipPath: isLast 
                            ? 'polygon(8% 0%, 92% 0%, 85% 100%, 15% 100%)'
                            : 'polygon(3% 0%, 97% 0%, 92% 100%, 8% 100%)'
                        }}
                      >
                        <div className="flex items-center justify-center gap-2 px-6 py-3.5">
                          <span className="text-sm font-medium text-white">{stage.stage}</span>
                          <span className="text-sm font-bold text-white">({stage.count})</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      ₹{(stage.value / 100000).toFixed(1)}L
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Deals by Stage Bar Chart */}
        <AnimatedCard className="lg:col-span-1" variant="glass" delay={0.6}>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Deals by Stage</CardTitle>
            <p className="text-xs text-slate-500">{safeStats.openOpportunities} Active Deals</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between h-48 gap-2">
              {safeDealsByStage.map((stage) => {
                const maxCount = Math.max(...safeDealsByStage.map(s => s.count), 1)
                const height = (stage.count / maxCount) * 100
                
                return (
                  <div key={stage.stage} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex items-end justify-center" style={{ height: '160px' }}>
                      <div 
                        className={`w-full rounded-t transition-all ${
                          stage.stage === 'WON' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{stage.stage}</div>
                      <div className="text-xs text-slate-500">{stage.count}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Revenue Trend Line Chart */}
        <AnimatedCard className="lg:col-span-1" variant="glass" delay={0.7}>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Revenue Trend</CardTitle>
            <p className="text-xs text-slate-500">Last 6 Months</p>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end justify-between gap-1">
              {safeRevenueData.map((month, idx) => {
                const maxTotal = Math.max(...safeRevenueData.map(m => m.total), 1)
                const height = (month.total / maxTotal) * 100
                
                return (
                  <div key={month.name} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex items-end justify-center" style={{ height: '160px' }}>
                      <div 
                        className="w-full bg-blue-500 dark:bg-blue-600 rounded-t transition-all"
                        style={{ height: `${height}%` }}
                        title={`₹${month.total.toLocaleString('en-IN')}`}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{month.name}</span>
                  </div>
                )
              })}
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

