import { NextRequest, NextResponse } from "next/server"
import { requireActionPermission } from "@/app/api/_lib/auth"
import { createOrderFromQuotation } from "@/app/actions/crm"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActionPermission("quotations", "create")
  if (!auth.authorized) return auth.response

  const { id } = await params
  const result = await createOrderFromQuotation(decodeURIComponent(id))
  if (result.error) {
    return NextResponse.json({ message: result.error }, { status: 500 })
  }
  return NextResponse.json({ sales_order_name: result.orderId })
}
