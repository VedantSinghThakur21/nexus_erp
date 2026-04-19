import { NextRequest, NextResponse } from "next/server"
import { requireActionPermission } from "@/app/api/_lib/auth"
import { convertOpportunityToCustomer } from "@/app/actions/crm"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActionPermission("crm", "convert")
  if (!auth.authorized) return auth.response

  try {
    const { id } = await params
    const result = await convertOpportunityToCustomer(decodeURIComponent(id))
    if (result.error) {
      return NextResponse.json({ message: result.error }, { status: 500 })
    }
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Unable to convert opportunity." }, { status: 500 })
  }
}
