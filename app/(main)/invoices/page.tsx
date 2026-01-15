import { getInvoices } from "@/app/actions/invoices"
import { getSalesOrdersReadyForInvoice } from "@/app/actions/sales-orders"
import { AnimatedButton } from "@/components/ui/animated"
import { Plus, FileText, Calendar, DollarSign } from "lucide-react"
import Link from "next/link"
import { InvoicesList } from "@/components/invoices/invoices-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const dynamic = 'force-dynamic'

export default async function InvoicesPage() {
  const [invoices, readyForInvoice] = await Promise.all([
    getInvoices(),
    getSalesOrdersReadyForInvoice()
  ])

  // Calculate total revenue from the fetched list
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.grand_total, 0)

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto" suppressHydrationWarning>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
            Invoices
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Manage billing and collections</p>
        </div>
        
        <Link href="/invoices/new">
            <AnimatedButton variant="neon" className="gap-2">
                <Plus className="h-4 w-4" /> New Invoice
            </AnimatedButton>
        </Link>
      </div>

      {/* Ready for Invoice Section */}
      {readyForInvoice.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Ready for Invoice
              <Badge variant="secondary">{readyForInvoice.length} Sales Orders</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" suppressHydrationWarning>
              {readyForInvoice.map((order: any) => (
                <div
                  key={order.name}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  suppressHydrationWarning
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold text-slate-900 dark:text-white">{order.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {order.customer_name || order.customer}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(order.transaction_date).toLocaleDateString('en-IN')}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {order.currency} {order.grand_total.toLocaleString('en-IN')}
                      </span>
                      {order.per_billed > 0 && (
                        <span className="text-blue-600">
                          {order.per_billed}% Billed
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href={`/invoices/new?sales_order=${encodeURIComponent(order.name)}`}>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Invoice
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <InvoicesList invoices={invoices} totalRevenue={totalRevenue} />
    </div>
  )
}

