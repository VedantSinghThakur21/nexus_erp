import { getInvoices } from "@/app/actions/invoices"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Download, FileText } from "lucide-react"
import Link from "next/link"

export default async function InvoicesPage() {
  const invoices = await getInvoices()

  // Calculate total revenue from the fetched list
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.grand_total, 0)

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Invoices</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage billing and collections</p>
        </div>
        
        {/* LINK TO THE NEW FULL-PAGE FORM */}
        <Link href="/invoices/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <Plus className="h-4 w-4" /> New Invoice
            </Button>
        </Link>
        
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
          <div className="rounded-md border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 font-medium text-slate-500">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No invoices found. Click "New Invoice" to create one.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.name} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                      <td className="p-4 font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            {/* Link to Detail Page */}
                            <Link 
                                href={`/invoices/${inv.name}`} 
                                className="hover:underline text-blue-600 dark:text-blue-400"
                            >
                                {inv.name}
                            </Link>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{inv.customer_name}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{inv.due_date}</td>
                      <td className="p-4 font-medium text-slate-900 dark:text-white">
                        {inv.currency} {inv.grand_total.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          inv.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                          inv.status === 'Overdue' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {/* Direct Link to ERPNext PDF Generation */}
                        <a 
                            href={`${process.env.ERP_NEXT_URL}/api/method/frappe.utils.print_format.download_pdf?doctype=Sales%20Invoice&name=${inv.name}&format=Standard`}
                            target="_blank"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
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
