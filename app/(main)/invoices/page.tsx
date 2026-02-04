export const dynamic = "force-dynamic"
import { getInvoices, getSalesOrdersReadyForInvoicePane } from "@/app/actions/invoices"
import { InvoicesClient } from "@/components/invoices/invoices-client"

export default async function InvoicesPage() {
  const [invoices, readyForInvoice] = await Promise.all([
    getInvoices(),
    getSalesOrdersReadyForInvoicePane()
  ])

  return <InvoicesClient invoices={invoices} readyForInvoice={readyForInvoice} />
}

