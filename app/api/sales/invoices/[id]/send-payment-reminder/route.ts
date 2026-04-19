import { NextRequest, NextResponse } from "next/server"
import { requireActionPermission } from "@/app/api/_lib/auth"
import { frappeRequest } from "@/app/lib/api"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActionPermission("invoices", "edit")
  if (!auth.authorized) return auth.response

  try {
    const { id } = await params
    const invoiceId = decodeURIComponent(id)
    await frappeRequest(
      "erpnext.accounts.doctype.sales_invoice.sales_invoice.make_dunning",
      "POST",
      { source_name: invoiceId }
    )
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Unable to send payment reminder." }, { status: 500 })
  }
}
