import { getInvoices } from "@/app/actions/invoices"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { InvoicesList } from "@/components/invoices/invoices-list"

export default async function InvoicesPage() {
  const invoices = await getInvoices()

  // Calculate total revenue from the fetched list
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.grand_total, 0)

  return (
    // FIX: Added suppressHydrationWarning to ignore browser extension attributes
    <div className="p-8 space-y-6" suppressHydrationWarning>
      <div className="flex justify-between items-center" suppressHydrationWarning>
        <div suppressHydrationWarning>
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

      <InvoicesList invoices={invoices} totalRevenue={totalRevenue} />
    </div>
  )
}