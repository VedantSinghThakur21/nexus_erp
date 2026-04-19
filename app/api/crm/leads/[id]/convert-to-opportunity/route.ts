import { NextRequest, NextResponse } from "next/server"
import { requireActionPermission } from "@/app/api/_lib/auth"
import { convertLeadToOpportunity } from "@/app/actions/crm"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActionPermission("crm", "convert")
  if (!auth.authorized) return auth.response

  try {
    const { id } = await params
    const leadId = decodeURIComponent(id)
    const result = await convertLeadToOpportunity(leadId, false, 0, "Sales", "Open")
    if (result.error) {
      return NextResponse.json({ message: result.error }, { status: 500 })
    }
    return NextResponse.json({ opportunity_name: result.opportunityId })
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Unable to convert lead." }, { status: 500 })
  }
}
