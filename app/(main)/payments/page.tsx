import { getPaymentEntries } from "@/app/actions/invoices"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Receipt, DollarSign, Calendar, CreditCard } from "lucide-react"
import Link from "next/link"

export default async function PaymentsPage() {
  const payments = await getPaymentEntries()

  // Calculate stats
  const totalPayments = payments.length
  const submittedPayments = payments.filter(p => p.docstatus === 1)
  const totalAmount = submittedPayments.reduce((sum, p) => sum + (p.paid_amount || 0), 0)
  const draftPayments = payments.filter(p => p.docstatus === 0).length
  
  // Group by payment type
  const receivePayments = payments.filter(p => p.payment_type === 'Receive')
  const payPayments = payments.filter(p => p.payment_type === 'Pay')

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Payment Entries</h1>
          <p className="text-slate-500 dark:text-slate-400">Track all payment transactions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <Receipt className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayments}</div>
            <p className="text-xs text-slate-500">{draftPayments} drafts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totalAmount.toLocaleString('en-IN')}</div>
            <p className="text-xs text-slate-500">Submitted only</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{receivePayments.length}</div>
            <p className="text-xs text-slate-500">Money In</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
            <CreditCard className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{payPayments.length}</div>
            <p className="text-xs text-slate-500">Money Out</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Payment Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Payment ID</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Party</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Mode</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500">
                      No payment entries found
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.name} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <Link href={`/payments/${payment.name}`} className="text-blue-600 hover:underline font-medium">
                          {payment.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(payment.posting_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4">{payment.party_name}</td>
                      <td className="py-3 px-4">
                        <Badge variant={payment.payment_type === 'Receive' ? 'default' : 'secondary'}>
                          {payment.payment_type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{payment.mode_of_payment || '-'}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        ₹{(payment.paid_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={
                          payment.docstatus === 1 ? 'bg-green-100 text-green-700' :
                          payment.docstatus === 2 ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }>
                          {payment.docstatus === 1 ? 'Submitted' : payment.docstatus === 2 ? 'Cancelled' : 'Draft'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/payments/${payment.name}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
