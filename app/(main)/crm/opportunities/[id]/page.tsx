import { frappeRequest } from "@/app/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, TrendingUp, User, Building2, DollarSign } from "lucide-react"
import Link from "next/link"
import { getOpportunity } from "@/app/actions/crm"
import { OpportunityActions } from "@/components/crm/opportunity-actions"
import { EditOpportunityDialog } from "@/components/crm/edit-opportunity-dialog"

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const opportunityName = decodeURIComponent(id)
  
  let opportunity
  try {
    opportunity = await getOpportunity(opportunityName)
  } catch (e) {
    console.error("Error fetching opportunity:", e)
    return (
      <div className="p-8 flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Opportunity Not Found</h1>
        <p className="text-muted-foreground">The opportunity "{opportunityName}" could not be found.</p>
        <Link href="/crm/opportunities">
          <Button variant="outline">Back to Pipeline</Button>
        </Link>
      </div>
    )
  }

  if (!opportunity) {
    return (
      <div className="p-8 flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Opportunity Not Found</h1>
        <p className="text-muted-foreground">The opportunity "{opportunityName}" could not be found.</p>
        <Link href="/crm/opportunities">
          <Button variant="outline">Back to Pipeline</Button>
        </Link>
      </div>
    )
  }

  // Sales stage colors (ERPNext default stages)
  const stageColors: Record<string, string> = {
    'Prospecting': 'bg-gray-100 text-gray-700',
    'Qualification': 'bg-blue-100 text-blue-700',
    'Proposal/Price Quote': 'bg-purple-100 text-purple-700',
    'Negotiation/Review': 'bg-orange-100 text-orange-700',
    'Won': 'bg-green-100 text-green-700',
    'Lost': 'bg-red-100 text-red-700'
  }

  const probabilityColor = (prob: number) => {
    if (prob >= 75) return 'bg-green-100 text-green-800'
    if (prob >= 50) return 'bg-yellow-100 text-yellow-800'
    if (prob >= 25) return 'bg-orange-100 text-orange-800'
    return 'bg-red-100 text-red-800'
  }

  // Check if opportunity is closed (won or lost)
  const isClosed = opportunity.status === 'Converted' || opportunity.status === 'Lost'
  const statusColors: Record<string, string> = {
    'Open': 'bg-blue-100 text-blue-700',
    'Converted': 'bg-green-100 text-green-700',
    'Lost': 'bg-red-100 text-red-700'
  }

  return (
    <div className="p-8 space-y-6">
      {/* Back Button */}
      <Link href="/crm/opportunities">
        <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" /> Back to Pipeline
        </Button>
      </Link>

      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {opportunity.opportunity_from === 'Lead' ? opportunity.party_name : opportunity.customer_name}
          </h1>
          <p className="text-slate-500">{opportunity.opportunity_type}</p>
        </div>
        <div className="flex gap-2 items-center">
          <EditOpportunityDialog opportunity={opportunity} />
          {/* Delete Button: Only show if Open */}
          {opportunity.status === 'Open' && (
            <form
              action={async () => {
                'use server'
                const { deleteOpportunity } = await import('@/app/actions/crm')
                const result = await deleteOpportunity(opportunity.name)
                if (result?.error) {
                  alert('Failed to delete opportunity: ' + result.error)
                } else {
                  window.location.href = '/crm/opportunities'
                }
              }}
              onSubmit={e => {
                if (!confirm('Are you sure you want to delete this opportunity? This action cannot be undone.')) {
                  e.preventDefault()
                }
              }}
            >
              <Button type="submit" variant="destructive" className="ml-2">
                Delete
              </Button>
            </form>
          )}
          {/* Show status badge for closed opportunities */}
          {isClosed ? (
            <Badge className={statusColors[opportunity.status] || 'bg-slate-100 text-slate-800'}>
              {opportunity.status === 'Converted' ? '✓ Won' : '✗ Lost'}
            </Badge>
          ) : (
            <>
              {/* Show stage and probability only for open opportunities */}
              <Badge className={stageColors[opportunity.sales_stage] || 'bg-slate-100 text-slate-800'}>
                {opportunity.sales_stage}
              </Badge>
              <Badge className={probabilityColor(opportunity.probability)}>
                {opportunity.probability}% Probability
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Opportunity Value</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(opportunity.opportunity_amount || 0).toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Expected Close</CardTitle>
            <Calendar className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {opportunity.expected_closing ? new Date(opportunity.expected_closing).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Not set'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Source</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{opportunity.source || 'Direct'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Territory</CardTitle>
            <Building2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{opportunity.territory || 'All'}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Opportunity Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-500">Type</label>
                <p className="text-slate-900 dark:text-slate-200">{opportunity.opportunity_type || 'Sales'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Currency</label>
                <p className="text-slate-900 dark:text-slate-200">{opportunity.currency || 'INR'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Contact Person</label>
                <p className="text-slate-900 dark:text-slate-200">{opportunity.contact_person || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Email</label>
                <p className="text-slate-900 dark:text-slate-200">{opportunity.contact_email || 'N/A'}</p>
              </div>
            </div>

            {/* Items Table */}
            {opportunity.items && opportunity.items.length > 0 && (
              <div className="mt-6">
                <label className="text-sm font-medium text-slate-500 mb-2 block">Items</label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium text-slate-500">Item</th>
                        <th className="text-right p-3 text-sm font-medium text-slate-500">Qty</th>
                        <th className="text-right p-3 text-sm font-medium text-slate-500">Rate</th>
                        <th className="text-right p-3 text-sm font-medium text-slate-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {opportunity.items.map((item: Record<string, any>, idx: number) => (
                        <tr key={idx} className="border-t">
                          <td className="p-3 text-sm">{item.item_code}</td>
                          <td className="p-3 text-sm text-right">{item.qty}</td>
                          <td className="p-3 text-sm text-right">₹{(item.rate || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3 text-sm text-right font-medium">₹{(item.amount || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="mt-6">
              <label className="text-sm font-medium text-slate-500">Notes</label>
              <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-md text-sm text-slate-700 dark:text-slate-300 min-h-[80px] whitespace-pre-wrap">
                {opportunity.notes || 'No notes added.'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Actions */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <OpportunityActions opportunity={opportunity} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
