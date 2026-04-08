import { getPaymentEntries } from "@/app/actions/invoices"
import { PaymentsClient } from "@/components/payments/payments-client"
import { requireModuleAccess } from "@/lib/auth-guard"

export const dynamic = 'force-dynamic'

export default async function PaymentsPage() {
  // Server-side authentication and role-based authorization
  await requireModuleAccess('payments')
  
  const payments = await getPaymentEntries()

  return <PaymentsClient payments={payments} />
}
