import { getPaymentEntry, PaymentEntry } from "@/app/actions/invoices"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Building2, Calendar, CreditCard, FileText, Receipt } from "lucide-react"
import Link from "next/link"

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payment = await getPaymentEntry(decodeURIComponent(id))

  if (!payment) {
    return <div className="p-8">Payment entry not found</div>
  }

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/payments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {payment.name}
            </h1>
            <Badge className={
              payment.docstatus === 1 ? 'bg-green-100 text-green-700' :
              payment.docstatus === 2 ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }>
              {payment.docstatus === 1 ? 'Submitted' : payment.docstatus === 2 ? 'Cancelled' : 'Draft'}
            </Badge>
          </div>
          <p className="text-slate-500">{payment.party_name}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Payment Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Payment Type & Mode */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-500">Payment Type</label>
                <div className="flex items-center gap-2 mt-1">
                  <Receipt className="h-4 w-4 text-slate-600" />
                  <Badge variant={payment.payment_type === 'Receive' ? 'default' : 'secondary'}>
                    {payment.payment_type}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-500">Mode of Payment</label>
                <div className="flex items-center gap-2 mt-1">
                  <CreditCard className="h-4 w-4 text-slate-600" />
                  <span className="font-medium">{payment.mode_of_payment || '-'}</span>
                </div>
              </div>
            </div>

            {/* Posting Date */}
            <div>
              <label className="text-sm text-slate-500">Posting Date</label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="h-4 w-4 text-slate-600" />
                <span className="font-medium">
                  {new Date(payment.posting_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Party Details */}
            <div className="border-t pt-4">
              <label className="text-sm text-slate-500">Party Type</label>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="h-4 w-4 text-slate-600" />
                <span className="font-medium">{payment.party_type}</span>
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-500">Party Name</label>
              <p className="font-medium mt-1">{payment.party_name}</p>
            </div>

            {/* Amount Details */}
            <div className="border-t pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Paid Amount</span>
                  <span className="font-semibold">₹{(payment.paid_amount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Received Amount</span>
                  <span className="font-semibold">₹{(payment.received_amount || 0).toLocaleString('en-IN')}</span>
                </div>
                {payment.difference_amount !== 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Difference</span>
                    <span className="font-semibold">₹{(payment.difference_amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Reference Details */}
            {(payment.reference_no || payment.reference_date) && (
              <div className="border-t pt-4">
                <label className="text-sm text-slate-500 mb-2 block">Reference Details</label>
                <div className="bg-slate-50 p-3 rounded-md space-y-1">
                  {payment.reference_no && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Reference No</span>
                      <span className="text-sm font-medium">{payment.reference_no}</span>
                    </div>
                  )}
                  {payment.reference_date && (
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Reference Date</span>
                      <span className="text-sm font-medium">
                        {new Date(payment.reference_date).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Linked Invoices */}
            {payment.references && payment.references.length > 0 && (
              <div className="border-t pt-4">
                <label className="text-sm text-slate-500 mb-3 block">Linked Invoices</label>
                <div className="space-y-2">
                  {payment.references.map((ref: any, idx: number) => (
                    <Link 
                      key={idx} 
                      href={`/invoices/${ref.reference_name}`}
                      className="flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-700">{ref.reference_name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">
                          ₹{(ref.allocated_amount || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-slate-500">
                          Outstanding: ₹{(ref.outstanding_amount || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Account Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">Paid From</label>
                <p className="text-sm font-medium mt-1">{payment.paid_from || '-'}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500">Paid To</label>
                <p className="text-sm font-medium mt-1">{payment.paid_to || '-'}</p>
              </div>
              {payment.paid_from_account_currency && (
                <div>
                  <label className="text-xs text-slate-500">Currency</label>
                  <p className="text-sm font-medium mt-1">{payment.paid_from_account_currency}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">System Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-600">
              <div>
                <label className="text-slate-500">Created</label>
                <p className="mt-1">
                  {new Date(payment.creation!).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <label className="text-slate-500">Modified</label>
                <p className="mt-1">
                  {new Date(payment.modified!).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              {payment.owner && (
                <div>
                  <label className="text-slate-500">Owner</label>
                  <p className="mt-1">{payment.owner}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
