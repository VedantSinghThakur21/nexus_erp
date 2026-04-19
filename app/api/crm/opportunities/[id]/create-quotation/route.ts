import { NextRequest, NextResponse } from "next/server"
import { requireActionPermission } from "@/app/api/_lib/auth"
import { frappeRequest } from "@/app/lib/api"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActionPermission("quotations", "create")
  if (!auth.authorized) return auth.response

  try {
    const { id } = await params
    const opportunityId = decodeURIComponent(id)
    const quotation = await frappeRequest(
      "erpnext.crm.doctype.opportunity.opportunity.make_quotation",
      "POST",
      { source_name: opportunityId }
    ) as any

    const quotationDoc = quotation?.message || quotation
    if (!quotationDoc) {
      return NextResponse.json({ message: "Failed to generate quotation from opportunity." }, { status: 500 })
    }

    if (!quotationDoc.name) {
      delete quotationDoc.name
    }

    const saved = await frappeRequest("frappe.client.insert", "POST", { doc: quotationDoc }) as any
    return NextResponse.json({ quotation_name: saved?.name })
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Unable to create quotation." }, { status: 500 })
  }
}
