import { getInvoices } from "@/app/actions/invoices"
import { AnimatedButton } from "@/components/ui/animated"
import { Plus } from "lucide-react"
import Link from "next/link"
import { InvoicesList } from "@/components/invoices/invoices-list"

export default async function InvoicesPage() {
  const invoices = await getInvoices()

  // Calculate total revenue from the fetched list
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.grand_total, 0)

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
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

      <InvoicesList invoices={invoices} totalRevenue={totalRevenue} />
    </div>
  )
}

