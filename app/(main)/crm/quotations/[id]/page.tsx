import { getQuotation } from "@/app/actions/crm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, FileText, Building2 } from "lucide-react"
import Link from "next/link"

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const quotationName = decodeURIComponent(id)
  
  let quotation
  try {
    quotation = await getQuotation(quotationName)
    
    // Additional null check
    if (!quotation) {
      throw new Error("Quotation not found")
    }
  } catch (e) {
    console.error("Error fetching quotation:", e)
    return (
      <div className="p-8 flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Quotation Not Found</h1>
        <p className="text-muted-foreground">The quotation "{quotationName}" could not be found.</p>
        <Link href="/crm/quotations">
          <Button variant="outline">Back to Quotations</Button>
        </Link>
      </div>
    )
  }

  // Status colors
  const statusColors: Record<string, string> = {
    'Draft': 'bg-slate-100 text-slate-800',
    'Open': 'bg-blue-100 text-blue-800',
    'Ordered': 'bg-green-100 text-green-800',
    'Lost': 'bg-red-100 text-red-800'
  }

  // Check if expired
  const isExpired = quotation.valid_till && new Date(quotation.valid_till) < new Date()

  return (
    <div className="p-8 space-y-6">
      {/* Back Button */}
      <Link href="/crm/quotations">
        <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" /> Back to Quotations
        </Button>
      </Link>

      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {quotation.name}
          </h1>
          <p className="text-slate-500">
            {quotation.quotation_to === 'Customer' ? 'Customer' : 'Lead'}: {quotation.customer_name || quotation.party_name}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge className={statusColors[quotation.status] || 'bg-slate-100 text-slate-800'}>
            {quotation.status}
          </Badge>
          {isExpired && quotation.status === 'Open' && (
            <Badge className="bg-orange-100 text-orange-800">Expired</Badge>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Transaction Date</CardTitle>
            <Calendar className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {quotation.transaction_date 
                ? new Date(quotation.transaction_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Not set'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Valid Until</CardTitle>
            <Calendar className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-semibold ${isExpired ? 'text-red-600' : ''}`}>
              {quotation.valid_till ? new Date(quotation.valid_till).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Currency</CardTitle>
            <Building2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{quotation.currency || 'INR'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          {quotation.items && quotation.items.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-slate-500">Item Code</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-500">Description</th>
                    <th className="text-right p-3 text-sm font-medium text-slate-500">Qty</th>
                    <th className="text-right p-3 text-sm font-medium text-slate-500">Rate</th>
                    <th className="text-right p-3 text-sm font-medium text-slate-500">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map((item: Record<string, any>, idx: number) => (
                    <tr key={idx} className="border-t">
                      <td className="p-3 text-sm font-medium">{item.item_code || 'N/A'}</td>
                      <td className="p-3 text-sm text-slate-600">{item.item_name || item.description || 'N/A'}</td>
                      <td className="p-3 text-sm text-right">{item.qty || 0}</td>
                      <td className="p-3 text-sm text-right">₹{(item.rate || 0).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-sm text-right font-medium">₹{(item.amount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t bg-slate-50 dark:bg-slate-900 p-4">
                <div className="flex justify-end gap-12">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-8">
                      <span className="text-slate-500">Net Total:</span>
                      <span className="font-medium">₹{(quotation.net_total || 0).toLocaleString('en-IN')}</span>
                    </div>
                    {(quotation.total_taxes_and_charges || 0) > 0 && (
                      <div className="flex justify-between gap-8">
                        <span className="text-slate-500">Taxes:</span>
                        <span className="font-medium">₹{(quotation.total_taxes_and_charges || 0).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-8 text-lg font-bold border-t pt-2">
                      <span>Grand Total:</span>
                      <span className="text-slate-900 dark:text-white">₹{(quotation.grand_total || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No items added to this quotation.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      {quotation.terms && (
        <Card>
          <CardHeader>
            <CardTitle>Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {quotation.terms}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked Opportunity */}
      {quotation.opportunity && (
        <Card>
          <CardHeader>
            <CardTitle>Linked Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <Link 
              href={`/crm/opportunities/${encodeURIComponent(quotation.opportunity)}`}
              className="text-blue-600 hover:underline flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              View Opportunity: {quotation.opportunity}
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
