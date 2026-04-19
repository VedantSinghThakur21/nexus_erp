import { NextRequest, NextResponse } from "next/server"
import { requireActionPermission } from "@/app/api/_lib/auth"
import { frappeRequest } from "@/app/lib/api"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActionPermission("payments", "create")
  if (!auth.authorized) return auth.response

  try {
    const { id } = await params
    const invoiceId = decodeURIComponent(id)
    const paymentTemplate = await frappeRequest(
      "erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry",
      "POST",
      { dt: "Sales Invoice", dn: invoiceId }
    )
    return NextResponse.json({ success: true, payment_template: paymentTemplate })
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Unable to prepare payment entry." }, { status: 500 })
  }
}
