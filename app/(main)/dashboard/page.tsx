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
                Mission Control
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
          title="Pending Tasks"
          value={safeStats.newLeadsToday + 18}
          change={{ value: 2, trend: 'down' }}
          icon={<svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
          delay={0.2}
        />

        {/* Fleet Availability */}
        <AnimatedStatCard
          title="Fleet Availability"
          value="85%"
          icon={<svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
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

        {/* Fleet Health Donut */}
        <AnimatedCard className="lg:col-span-1" variant="glass" delay={0.6}>
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base font-semibold">Fleet Health</CardTitle>
                <p className="text-xs text-slate-500 mt-1">Real-time vehicle status</p>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" className="dark:stroke-slate-700"/>
                  {/* Active - Blue */}
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="12" strokeDasharray="150 251" strokeLinecap="round"/>
                  {/* Idle - Orange */}
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="12" strokeDasharray="50 251" strokeDashoffset="-150" strokeLinecap="round"/>
                  {/* Maintenance - Red */}
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="12" strokeDasharray="51 251" strokeDashoffset="-200" strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">48</div>
                  <div className="text-xs text-slate-500">VEHICLES</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">Active</span>
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">31</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">Idle</span>
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">8</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <div className="w-2 h-2 rounded-full bg-red-600"></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">Maint</span>
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">9</div>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>
      </div>

      {/* Tables Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* Recent Sales Orders */}
        <AnimatedCard variant="glass" delay={0.8}>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">Recent Sales Orders</CardTitle>
            <Link href="/invoices">
              <AnimatedButton variant="ghost" size="sm" className="text-blue-600 p-0 h-auto">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </AnimatedButton>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-4 pb-2 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400">
                <div>ORDER ID</div>
                <div>CUSTOMER</div>
                <div>AMOUNT</div>
                <div>STATUS</div>
              </div>
              {[
                { id: 'SO-2024-001', customer: 'Acme Corp', amount: '₹12,450', status: 'Completed', statusColor: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300' },
                { id: 'SO-2024-002', customer: 'Globex Inc', amount: '₹3,250', status: 'Processing', statusColor: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300' },
              ].map((order, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-4 py-3 text-sm items-center hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors">
                  <div className="font-medium text-blue-600 dark:text-blue-400">{order.id}</div>
                  <div className="text-slate-900 dark:text-white">{order.customer}</div>
                  <div className="font-semibold text-slate-900 dark:text-white">{order.amount}</div>
                  <div>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${order.statusColor}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Urgent Actions */}
        <AnimatedCard variant="glass" delay={0.9}>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">Urgent Actions</CardTitle>
            <Link href="/crm">
              <AnimatedButton variant="ghost" size="sm" className="text-blue-600 p-0 h-auto">
                Go to Tasks <ArrowRight className="h-3 w-3 ml-1" />
              </AnimatedButton>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { 
                  icon: <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                  title: 'Approve Invoice #INV-9921',
                  subtitle: 'Pending approval from Finance Manager',
                  color: 'bg-red-50 dark:bg-red-900/20'
                },
                { 
                  icon: <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
                  title: 'Vehicle #V-04 Maintenance',
                  subtitle: 'Scheduled service overdue by 2 days',
                  color: 'bg-orange-50 dark:bg-orange-900/20'
                },
              ].map((action, idx) => (
                <div key={idx} className={`p-3 rounded-lg ${action.color} flex items-start gap-3 hover:shadow-md transition-shadow cursor-pointer`}>
                  <div className="mt-0.5">{action.icon}</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-slate-900 dark:text-white">{action.title}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{action.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </AnimatedCard>
      </div>
    </div>
  )
}

