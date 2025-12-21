import { getQuotations } from "@/app/actions/crm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, DollarSign, TrendingUp } from "lucide-react"
import Link from "next/link"

export default async function QuotationsPage() {
  const quotations = await getQuotations()

  // Status colors
  const statusColors: Record<string, string> = {
    'Draft': 'bg-slate-100 text-slate-800',
    'Open': 'bg-blue-100 text-blue-800',
    'Ordered': 'bg-green-100 text-green-800',
    'Lost': 'bg-red-100 text-red-800',
    'Expired': 'bg-orange-100 text-orange-800'
  }

  // Check if expired
  const isExpired = (validTill: string) => {
    return new Date(validTill) < new Date()
  }

  // Stats
  const stats = {
    total: quotations.length,
    open: quotations.filter(q => q.status === 'Open').length,
    ordered: quotations.filter(q => q.status === 'Ordered').length,
    totalValue: quotations.reduce((sum, q) => sum + (q.grand_total || 0), 0)
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Quotations</h1>
          <p className="text-slate-500 mt-1">Manage and track all customer quotations</p>
        </div>
        <div className="flex gap-2">
          <Link href="/crm/opportunities">
            <Button variant="outline">View Opportunities</Button>
          </Link>
          <Link href="/crm">
            <Button variant="outline">Back to CRM</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Quotations</CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Open</CardTitle>
            <FileText className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Ordered</CardTitle>
            <FileText className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.ordered}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalValue.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quotations List */}
      <Card>
        <CardHeader>
          <CardTitle>All Quotations</CardTitle>
          <CardDescription>Click on a quotation to view details</CardDescription>
        </CardHeader>
        <CardContent>
          {quotations.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="font-medium text-lg mb-2">No quotations yet</p>
              <p className="text-sm mt-2 mb-4">To create a quotation:</p>
              <ol className="text-sm text-left max-w-md mx-auto space-y-2 mb-6">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>Create an <strong>Opportunity</strong> from a qualified lead</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>Move opportunity to <strong>"Proposal"</strong> stage</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>Click <strong>"Create Quotation"</strong> in opportunity details</span>
                </li>
              </ol>
              <Link href="/crm/opportunities">
                <Button className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Go to Opportunities
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {quotations.map((quotation) => {
                const expired = isExpired(quotation.valid_till)
                const displayStatus = expired && quotation.status === 'Open' ? 'Expired' : quotation.status

                return (
                  <Link 
                    key={quotation.name} 
                    href={`/crm/quotations/${encodeURIComponent(quotation.name)}`}
                    className="block"
                  >
                    <div className="border rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                              {quotation.name}
                            </h3>
                            <Badge className={statusColors[displayStatus] || 'bg-slate-100 text-slate-800'}>
                              {displayStatus}
                            </Badge>
                          </div>
                          
                          <div className="grid md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-slate-500">Customer: </span>
                              <span className="font-medium">{quotation.customer_name || quotation.party_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              <span className="text-slate-500">Valid till: </span>
                              <span className={`font-medium ${expired ? 'text-red-600' : ''}`}>
                                {new Date(quotation.valid_till).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">Amount: </span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                ₹{(quotation.grand_total || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
