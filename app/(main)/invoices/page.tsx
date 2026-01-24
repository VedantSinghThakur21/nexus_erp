export const dynamic = "force-dynamic"
import { getInvoices, getSalesOrdersReadyForInvoicePane } from "@/app/actions/invoices"
import { getSalesOrdersEligibleForInvoice, getSalesOrders } from "@/app/actions/sales-orders"
import { AnimatedButton } from "@/components/ui/animated"
import { Plus, Calendar, DollarSign, CheckCircle } from "lucide-react"
import Link from "next/link"
import { InvoicesClientView } from "@/components/invoices/invoices-client-view"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DeliveryStatusBadge } from "@/components/sales-orders/delivery-status-badge"

export default async function InvoicesPage() {
  const [invoices, readyForInvoice, eligibleForInvoice, allSalesOrders] = await Promise.all([
    getInvoices(),
    getSalesOrdersReadyForInvoicePane(),
    getSalesOrdersEligibleForInvoice(),
    getSalesOrders()
  ])

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto" suppressHydrationWarning>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl lg:text-4xl font-bold">Invoices</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Manage billing and collections</p>
        </div>

        <Link href="/invoices/new">
          <AnimatedButton variant="neon" className="gap-2">
            <Plus className="h-4 w-4" /> New Invoice
          </AnimatedButton>
        </Link>
      </div>

      {/* Ready for Invoice */}
      <div>
        {readyForInvoice && readyForInvoice.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Ready for Invoice
                <Badge variant="secondary">{readyForInvoice.length} Sales Orders</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {readyForInvoice.map((order: any) => (
                  <div key={order.name} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold">{order.name}</h4>
                        <Badge variant="outline" className="text-xs">{order.status}</Badge>
                        <DeliveryStatusBadge status={order.delivery_status} />
                      </div>
                      <p className="text-sm text-slate-600">{order.customer_name || order.customer}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(order.transaction_date).toLocaleDateString('en-IN')}</span>
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{order.currency} {order.grand_total?.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <Link href={`/invoices/new?sales_order=${encodeURIComponent(order.name)}`}>
                      <Button size="sm">Create Invoice</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Ready for Invoice (Debug)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">No sales orders passed the pane filter.</p>
              <p className="text-sm text-slate-500 mt-2">Found {eligibleForInvoice?.length ?? 0} potentially eligible Sales Orders.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* All Invoices (grid) */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">All Invoices</h2>
        <InvoicesClientView invoices={invoices} />
      </div>
    </div>
  )
}

