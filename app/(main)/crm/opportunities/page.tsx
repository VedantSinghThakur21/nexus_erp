import { getOpportunities } from "@/app/actions/crm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, Calendar, DollarSign, FileText } from "lucide-react"
import Link from "next/link"

export default async function OpportunitiesPage() {
  const opportunities = await getOpportunities()

  // Group by sales stage
  const stages = [
    { name: 'Prospecting', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    { name: 'Qualification', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { name: 'Proposal', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { name: 'Negotiation', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { name: 'Won', color: 'bg-green-100 text-green-700 border-green-200' },
    { name: 'Lost', color: 'bg-red-100 text-red-700 border-red-200' }
  ]

  const groupedOpportunities = stages.map(stage => ({
    ...stage,
    opportunities: opportunities.filter(opp => opp.sales_stage === stage.name),
    totalValue: opportunities
      .filter(opp => opp.sales_stage === stage.name)
      .reduce((sum, opp) => sum + (opp.opportunity_amount || 0), 0)
  }))

  const totalPipelineValue = opportunities
    .filter(opp => opp.sales_stage !== 'Won' && opp.sales_stage !== 'Lost')
    .reduce((sum, opp) => sum + (opp.opportunity_amount || 0), 0)

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
            <div className="text-2xl font-bold">{opportunities.filter(o => o.status === 'Open').length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opportunities.filter(o => o.sales_stage === 'Won').length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Probability</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {opportunities.length > 0 
                ? Math.round(opportunities.reduce((sum, o) => sum + (o.probability || 0), 0) / opportunities.length) 
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {groupedOpportunities.map(stage => (
          <Card key={stage.name} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{stage.name}</CardTitle>
                <Badge variant="outline" className={stage.color}>
                  {stage.opportunities.length}
                </Badge>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                ₹{stage.totalValue.toLocaleString('en-IN')}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 flex-1">
              {stage.opportunities.map(opp => (
                <Link key={opp.name} href={`/crm/opportunities/${opp.name}`}>
                  <div className="p-3 bg-white dark:bg-slate-900 border rounded-lg hover:shadow-md transition-all cursor-pointer">
                    <div className="font-medium text-sm text-slate-900 dark:text-white mb-1 line-clamp-2">
                      {opp.customer_name || opp.party_name}
                    </div>
                    <div className="text-xs text-slate-500 mb-2">
                      {opp.opportunity_type}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-green-600">
                        ₹{(opp.opportunity_amount || 0).toLocaleString('en-IN')}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {opp.probability}%
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
              {stage.opportunities.length === 0 && (
                <div className="text-xs text-center text-slate-400 py-4">
                  No opportunities
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
