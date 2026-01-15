import { getPaymentEntries } from "@/app/actions/invoices"
import { AnimatedStatCard, AnimatedCard, AnimatedButton } from "@/components/ui/animated"
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Receipt, DollarSign, Calendar, CreditCard } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

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
    <div suppressHydrationWarning className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h1 className="text-2xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">Payment Entries</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Track all payment transactions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <AnimatedStatCard
          title="Total Payments"
          value={totalPayments}
          icon={<Receipt className="h-5 w-5" />}
          delay={0}
        />

        <AnimatedStatCard
          title="Total Amount"
          value={`₹${totalAmount.toLocaleString('en-IN')}`}
          icon={<DollarSign className="h-5 w-5" />}
          variant="neon"
          delay={0.1}
        />

        <AnimatedStatCard
          title="Received"
          value={receivePayments.length}
          icon={<CreditCard className="h-5 w-5" />}
          delay={0.2}
        />

        <AnimatedStatCard
          title="Paid Out"
          value={payPayments.length}
          icon={<CreditCard className="h-5 w-5" />}
          delay={0.3}
        />
      </div>

      {/* Payments Table */}
      <AnimatedCard variant="glass" delay={0.4}>
        <CardHeader>
          <CardTitle>All Payment Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Payment ID</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Party</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Mode</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500 dark:text-slate-400">
                      No payment entries found
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.name} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="py-3 px-4">
                        <Link href={`/payments/${payment.name}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                          {payment.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {new Date(payment.posting_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-slate-900 dark:text-white">{payment.party_name}</td>
                      <td className="py-3 px-4">
                        <Badge variant={payment.payment_type === 'Receive' ? 'default' : 'secondary'}>
                          {payment.payment_type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{payment.mode_of_payment || '-'}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">
                        ₹{(payment.paid_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={
                          payment.docstatus === 1 ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                          payment.docstatus === 2 ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' :
                          'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
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
      </AnimatedCard>
    </div>
  )
}

