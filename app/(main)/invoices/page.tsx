export const dynamic = "force-dynamic"
import { getInvoices, getSalesOrdersReadyForInvoicePane } from "@/app/actions/invoices"
import { InvoicesClient } from "@/components/invoices/invoices-client"
import { requireModuleAccess } from "@/lib/auth-guard"

export default async function InvoicesPage() {
  // Server-side authentication and role-based authorization
  await requireModuleAccess('invoices')
  
  const [invoices, readyForInvoice] = await Promise.all([
    getInvoices(),
    getSalesOrdersReadyForInvoicePane()
  ])

  return <InvoicesClient invoices={invoices} readyForInvoice={readyForInvoice} />
}
