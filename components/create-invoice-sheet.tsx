import { getInvoices } from "@/app/actions/invoices"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Download } from "lucide-react"
import { CreateInvoiceSheet } from "@/components/invoices/create-invoice-sheet" // <--- Import Component

export default async function InvoicesPage() {
  const invoices = await getInvoices()

  // Calculate total revenue from the fetched list
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.grand_total, 0)

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Invoices</h1>
          <p className="text-muted-foreground">Manage billing and collections</p>
        </div>
        
        {/* Replaced static button with the Dynamic Invoice Form */}
        <CreateInvoiceSheet />
        
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <span className="text-muted-foreground">$</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Invoice #</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Customer</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Date</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Amount</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No invoices found. Use the button above to create one!
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.name} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{inv.name}</td>
                      <td className="px-4 py-3 text-foreground">{inv.customer_name}</td>
                      <td className="px-4 py-3 text-foreground">{inv.due_date}</td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {inv.currency} {inv.grand_total.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          inv.status === 'Paid' ? 'bg-green-100 text-green-800' :
                          inv.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {/* Direct Link to ERPNext PDF Generation */}
                        <a 
                            href={`${process.env.NEXT_PUBLIC_ERP_NEXT_URL}/api/method/frappe.utils.print_format.download_pdf?doctype=Sales%20Invoice&name=${inv.name}&format=Standard`}
                            target="_blank"
                            className="text-blue-600 hover:text-blue-800"
                        >
                            <Download className="h-4 w-4" />
                        </a>
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

