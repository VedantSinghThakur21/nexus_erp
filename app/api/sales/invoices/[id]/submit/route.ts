import { NextRequest, NextResponse } from "next/server"
import { requireActionPermission } from "@/app/api/_lib/auth"
import { submitInvoice } from "@/app/actions/invoices"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActionPermission("invoices", "edit")
  if (!auth.authorized) return auth.response

  const { id } = await params
  const result = await submitInvoice(decodeURIComponent(id))
  if (result.error) {
    return NextResponse.json({ message: result.error }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
