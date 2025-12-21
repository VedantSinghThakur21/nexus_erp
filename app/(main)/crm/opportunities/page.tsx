import { getOpportunities } from "@/app/actions/crm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, Calendar, DollarSign, FileText, LayoutGrid, List } from "lucide-react"
import Link from "next/link"
import { OpportunitiesList } from "@/components/crm/opportunities-list"

export default async function OpportunitiesPage() {
  const opportunities = await getOpportunities()

  // Use only logical/active stages (exclude Won/Lost)
  const stages = [
    { name: 'Prospecting', color: 'bg-gray-100 text-gray-700 border-gray-200', stage: 1 },
    { name: 'Qualification', color: 'bg-blue-100 text-blue-700 border-blue-200', stage: 2 },
    { name: 'Needs Analysis', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', stage: 3 },
    { name: 'Value Proposition', color: 'bg-purple-100 text-purple-700 border-purple-200', stage: 4 },
    { name: 'Identify Decision Makers', color: 'bg-violet-100 text-violet-700 border-violet-200', stage: 5 },
    { name: 'Perception Analysis', color: 'bg-pink-100 text-pink-700 border-pink-200', stage: 6 },
    { name: 'Proposal/Price Quote', color: 'bg-orange-100 text-orange-700 border-orange-200', stage: 7 },
    { name: 'Negotiation/Review', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', stage: 8 }
  ]

  // Only count active opportunities (not Won/Lost)
  const activeOpportunities = opportunities.filter(opp => 
    opp.status === 'Open' && opp.sales_stage !== 'Won' && opp.sales_stage !== 'Lost'
  )

  const groupedOpportunities = stages.map(stage => ({
    ...stage,
    opportunities: activeOpportunities.filter(opp => opp.sales_stage === stage.name),
    totalValue: activeOpportunities
      .filter(opp => opp.sales_stage === stage.name)
      .reduce((sum, opp) => sum + (opp.opportunity_amount || 0), 0)
  }))

  const totalPipelineValue = activeOpportunities
    .reduce((sum, opp) => sum + (opp.opportunity_amount || 0), 0)
  
  const wonThisMonth = opportunities.filter(opp => {
    if (opp.sales_stage !== 'Won') return false
    // Simple month check - in production you'd parse the modified date
    return true
  }).length

  const avgProbability = activeOpportunities.length > 0
    ? Math.round(activeOpportunities.reduce((sum, opp) => sum + (opp.probability || 0), 0) / activeOpportunities.length)
    : 0

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Sales Pipeline</h1>
          <p className="text-slate-500 dark:text-slate-400">Track opportunities through the sales process</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-slate-500">Total Pipeline Value</div>
            <div className="text-2xl font-bold text-green-600">₹{totalPipelineValue.toLocaleString('en-IN')}</div>
          </div>
          <div className="flex gap-2">
            <Link href="/crm/quotations">
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" /> Quotations
              </Button>
            </Link>
            <Link href="/crm">
              <Button variant="outline">Back to Leads</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Pipeline Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Opportunities</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOpportunities.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wonThisMonth}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Probability</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProbability}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Board - Horizontal Scroll */}
      <div className="space-y-4">
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory">
          {groupedOpportunities.map((stage) => (
            <div key={stage.name} className="flex-shrink-0 w-80 snap-start">
              <Card className={`border-t-4 ${stage.color.split(' ')[2]} h-full`}>
                <CardHeader className="pb-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {stage.name}
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-1">Stage {stage.stage}</p>
                    </div>
                    <Badge variant="secondary" className={`${stage.color} text-xs font-semibold`}>
                      {stage.opportunities.length}
                    </Badge>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    ₹{stage.totalValue.toLocaleString('en-IN')}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                  {stage.opportunities.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">No opportunities</p>
                  ) : (
                    stage.opportunities.map((opp) => (
                      <Link key={opp.name} href={`/crm/opportunities/${encodeURIComponent(opp.name)}`}>
                        <Card className="hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer border">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-2">
                                {opp.opportunity_from === 'Lead' ? opp.party_name : opp.customer_name}
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">{opp.opportunity_type}</span>
                                <Badge variant="outline" className="text-xs font-semibold">
                                  {opp.probability}%
                                </Badge>
                              </div>
                              <div className="text-base font-bold text-green-600">
                                ₹{(opp.opportunity_amount || 0).toLocaleString('en-IN')}
                              </div>
                              {opp.expected_closing && (
                                <div className="text-xs text-slate-400 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(opp.expected_closing).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* List View Option */}
      <OpportunitiesList opportunities={activeOpportunities} stages={stages} />
    </div>
  )
}
