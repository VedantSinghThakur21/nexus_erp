import { getPaymentEntries } from "@/app/actions/invoices"
import { PaymentsClient } from "@/components/payments/payments-client"

export const dynamic = 'force-dynamic'

export default async function PaymentsPage() {
  const payments = await getPaymentEntries()

  return <PaymentsClient payments={payments} />
}

