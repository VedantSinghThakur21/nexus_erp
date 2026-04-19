import { NextRequest, NextResponse } from "next/server"
import { requireActionPermission } from "@/app/api/_lib/auth"
import { frappeRequest } from "@/app/lib/api"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActionPermission("crm", "create")
  if (!auth.authorized) return auth.response

  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const date = body?.date || new Date().toISOString().slice(0, 10)

    const opportunityId = decodeURIComponent(id)
    const opportunity = await frappeRequest("frappe.client.get", "GET", {
      doctype: "Opportunity",
      name: opportunityId,
    }) as any

    const todo = await frappeRequest("frappe.client.insert", "POST", {
      doc: {
        doctype: "ToDo",
        description: `Follow up on Opportunity ${opportunityId}`,
        date,
        reference_type: "Opportunity",
        reference_name: opportunityId,
        status: "Open",
        owner: opportunity?.owner,
      },
    })

    return NextResponse.json({ success: true, todo })
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Unable to schedule follow-up." }, { status: 500 })
  }
}
