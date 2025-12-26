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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">Overview</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Performance Metrics</p>
      </div>

      {/* Performance Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        
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

      {/* Charts Section - 3 columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Sales Pipeline Funnel */}
        <AnimatedCard className="border-slate-200 dark:border-slate-700" variant="glass" delay={0.4}>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium">Sales Pipeline Funnel</CardTitle>
            <p className="text-xs text-slate-500 mt-1">₹{(safePipelineFunnel.reduce((acc, s) => acc + (s.value || 0), 0) / 100000).toFixed(2)}M Potential Value</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {safePipelineFunnel.map((stage, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{stage.stage} ({stage.count})</span>
                    <span className="text-slate-900 dark:text-white font-semibold">{stage.value ? `₹${(stage.value / 1000).toFixed(0)}k` : ''}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded h-8 flex items-center overflow-hidden">
                    <div 
                      className="h-8 bg-gradient-to-r from-blue-500 to-blue-400 flex items-center px-3 text-white text-xs font-medium transition-all duration-500 ease-out" 
                      style={{ width: `${Math.max((stage.count / (safePipelineFunnel[0]?.count || 1)) * 100, 10)}%` }}
                    >
                    </div>
                  </div>
                </div>
              ))}
              {safePipelineFunnel.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">No pipeline data</div>
              )}
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Deals By Stage - Bar Chart */}
        <AnimatedCard className="border-slate-200 dark:border-slate-700" variant="glass" delay={0.5}>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium">Deals by Stage</CardTitle>
            <p className="text-xs text-slate-500 mt-1">{safeDealsByStage.reduce((acc, s) => acc + s.count, 0)} Active Deals</p>
          </CardHeader>
          <CardContent>
            <div className="h-56 flex items-end justify-between gap-3 pb-6">
              {safeDealsByStage.map((stage, idx) => {
                const maxCount = Math.max(...safeDealsByStage.map(s => s.count), 1)
                const height = (stage.count / maxCount) * 100
                const colors = ['bg-blue-400', 'bg-cyan-400', 'bg-indigo-400', 'bg-blue-500', 'bg-emerald-500']
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{stage.count}</div>
                    <div className="flex-1 w-full flex items-end justify-center">
                      <div 
                        className={`w-full ${colors[idx % colors.length]} rounded-t transition-all duration-500 ease-out hover:opacity-80 cursor-pointer`}
                        style={{ height: `${Math.max(height, 5)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium uppercase">{stage.stage.substring(0, 5)}</div>
                  </div>
                )
              })}
              {safeDealsByStage.length === 0 && (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">No deals data</div>
              )}
            </div>
          </CardContent>
        </AnimatedCard>

        {/* Revenue Trend - Line Chart */}
        <AnimatedCard className="border-slate-200 dark:border-slate-700" variant="glass" delay={0.6}>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium">Revenue Trend</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Last 6 Months</p>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {safeRevenueData.length > 0 ? (
                <>
                  <svg viewBox="0 0 300 180" className="w-full" style={{ height: '200px' }} preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="0" y1="45" x2="300" y2="45" stroke="currentColor" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="0.5" />
                    <line x1="0" y1="90" x2="300" y2="90" stroke="currentColor" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="0.5" />
                    <line x1="0" y1="135" x2="300" y2="135" stroke="currentColor" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="0.5" />
                    
                    {/* Area fill */}
                    <defs>
                      <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M 0 ${180 - (safeRevenueData[0].total / Math.max(...safeRevenueData.map(d => d.total), 1)) * 150} ${safeRevenueData.map((d, i) => `L ${(i / (safeRevenueData.length - 1)) * 300} ${180 - (d.total / Math.max(...safeRevenueData.map(d => d.total), 1)) * 150}`).join(' ')} L 300 180 L 0 180 Z`}
                      fill="url(#areaGradient)"
                      className="transition-all duration-500"
                    />
                    
                    {/* Line */}
                    <path
                      d={`M 0 ${180 - (safeRevenueData[0].total / Math.max(...safeRevenueData.map(d => d.total), 1)) * 150} ${safeRevenueData.map((d, i) => `L ${(i / (safeRevenueData.length - 1)) * 300} ${180 - (d.total / Math.max(...safeRevenueData.map(d => d.total), 1)) * 150}`).join(' ')}`}
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-500"
                    />
                    
                    {/* Data points */}
                    {safeRevenueData.map((d, i) => (
                      <circle
                        key={i}
                        cx={(i / (safeRevenueData.length - 1)) * 300}
                        cy={180 - (d.total / Math.max(...safeRevenueData.map(d => d.total), 1)) * 150}
                        r="4"
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth="2"
                        className="transition-all duration-300 hover:r-6"
                      />
                    ))}
                  </svg>
                  {/* X-axis labels */}
                  <div className="flex justify-between mt-1 px-2">
                    {safeRevenueData.map((d, i) => (
                      <span key={i} className="text-xs text-slate-600 dark:text-slate-400">{d.name}</span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">No revenue data</div>
              )}
            </div>
          </CardContent>
        </AnimatedCard>
      </div>

      {/* Tables Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* My Open Leads */}
        <AnimatedCard className="border-slate-200 dark:border-slate-700" variant="glass" delay={0.7}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium">My Open Leads</CardTitle>
            <Link href="/crm" className="text-xs text-blue-600 hover:underline">View All</Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 pb-3">Lead Name</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 pb-3">Company</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 pb-3">Status</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 pb-3">Last Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {safeMyLeads.slice(0, 4).map((lead: any, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 text-sm font-medium text-slate-900 dark:text-white">{lead.lead_name || 'N/A'}</td>
                      <td className="py-3 text-sm text-slate-600 dark:text-slate-400">{lead.company_name || 'N/A'}</td>
                      <td className="py-3">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {lead.status || 'New'}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-slate-600 dark:text-slate-400">{idx === 0 ? '2 hours' : idx === 1 ? 'Yesterday' : `${idx + 1} days`}</td>
                    </tr>
                  ))}
                  {safeMyLeads.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-sm text-slate-400">No leads available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </AnimatedCard>

        {/* My Open Opportunities */}
        <AnimatedCard className="border-slate-200 dark:border-slate-700" variant="glass" delay={0.8}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium">My Open Opportunities</CardTitle>
            <Link href="/crm" className="text-xs text-blue-600 hover:underline">View All</Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 pb-3">Opportunity</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 pb-3">Stage</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 pb-3">Value</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 pb-3">Probability</th>
                  </tr>
                </thead>
                <tbody>
                  {safeMyOpportunities.slice(0, 4).map((opp: any, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 text-sm font-medium text-slate-900 dark:text-white">{opp.party_name || 'Unknown'}</td>
                      <td className="py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          opp.sales_stage === 'Proposal' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                          opp.sales_stage === 'Negotiation' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' :
                          opp.sales_stage === 'Qualification' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300'
                        }`}>
                          {opp.sales_stage || opp.status || 'Open'}
                        </span>
                      </td>
                      <td className="py-3 text-sm font-semibold text-slate-900 dark:text-white">₹{((opp.opportunity_amount || 0) / 1000).toFixed(0)}K</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[60px] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${opp.probability || 50}%` }}></div>
                          </div>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{opp.probability || 50}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {safeMyOpportunities.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-sm text-slate-400">No opportunities available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </AnimatedCard>
      </div>
    </div>
  )
}

