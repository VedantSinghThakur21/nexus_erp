import { getOpportunities } from "@/app/actions/crm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, Calendar, DollarSign, FileText, LayoutGrid, List } from "lucide-react"
import Link from "next/link"
import { OpportunitiesView } from "@/components/crm/opportunities-view"

export default async function OpportunitiesPage() {
  const opportunities = await getOpportunities()

  // ERPNext default stages
  const stages = [
    { name: 'Prospecting', color: 'bg-gray-100 text-gray-700 border-gray-200', stage: 1 },
    { name: 'Qualification', color: 'bg-blue-100 text-blue-700 border-blue-200', stage: 2 },
    { name: 'Proposal/Price Quote', color: 'bg-purple-100 text-purple-700 border-purple-200', stage: 3 },
    { name: 'Negotiation/Review', color: 'bg-orange-100 text-orange-700 border-orange-200', stage: 4 }
  ]

  // Filter opportunities by status
  const activeOpportunities = opportunities.filter(opp => 
    opp.status === 'Open'
  )
  
  const wonOpportunities = opportunities.filter(opp => 
    opp.status === 'Converted'
  )
  
  const lostOpportunities = opportunities.filter(opp => 
    opp.status === 'Lost'
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
  
  const wonThisMonth = wonOpportunities.length

  const avgProbability = activeOpportunities.length > 0
    ? Math.round(activeOpportunities.reduce((sum, opp) => sum + (opp.probability || 0), 0) / activeOpportunities.length)
    : 0

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
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

      {/* View Component with Kanban and List */}
      <OpportunitiesView 
        opportunities={activeOpportunities} 
        groupedOpportunities={groupedOpportunities}
        stages={stages} 
      />

      {/* Won Opportunities Section - Summary */}
      {wonOpportunities.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">Won Opportunities</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {wonOpportunities.length} deals won • ₹{wonOpportunities.reduce((sum, opp) => sum + (opp.opportunity_amount || 0), 0).toLocaleString('en-IN')} total value
              </p>
            </div>
            <Link href="/crm/opportunities?filter=won">
              <Button variant="outline" size="sm" className="gap-2">
                View All Won Deals
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {wonOpportunities.slice(0, 4).map((opp) => (
              <Link key={opp.name} href={`/crm/opportunities/${opp.name}`}>
                <Card className="hover:shadow-md transition-shadow border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-base text-slate-900 dark:text-white">{opp.customer_name || opp.party_name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{opp.opportunity_type}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-green-700 dark:text-green-400">₹{(opp.opportunity_amount || 0).toLocaleString('en-IN')}</div>
                        <Badge className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 mt-1 text-xs">Converted</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {wonOpportunities.length > 4 && (
            <div className="text-center mt-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                + {wonOpportunities.length - 4} more won opportunities
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lost Opportunities Section - Summary */}
      {lostOpportunities.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">Lost Opportunities</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {lostOpportunities.length} deals lost • ₹{lostOpportunities.reduce((sum, opp) => sum + (opp.opportunity_amount || 0), 0).toLocaleString('en-IN')} lost value
              </p>
            </div>
            <Link href="/crm/opportunities?filter=lost">
              <Button variant="outline" size="sm" className="gap-2">
                View All Lost Deals
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {lostOpportunities.slice(0, 4).map((opp) => (
              <Link key={opp.name} href={`/crm/opportunities/${opp.name}`}>
                <Card className="hover:shadow-md transition-shadow border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-base text-slate-900 dark:text-white">{opp.customer_name || opp.party_name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{opp.opportunity_type}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-red-700 dark:text-red-400">₹{(opp.opportunity_amount || 0).toLocaleString('en-IN')}</div>
                        <Badge className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 mt-1 text-xs">Lost</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {lostOpportunities.length > 4 && (
            <div className="text-center mt-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                + {lostOpportunities.length - 4} more lost opportunities
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

