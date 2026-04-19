import { NextRequest, NextResponse } from "next/server"
import { requireActionPermission } from "@/app/api/_lib/auth"
import { frappeRequest } from "@/app/lib/api"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActionPermission("crm", "edit")
  if (!auth.authorized) return auth.response

  try {
    const { id } = await params
    const payload = await req.json()
    const update = await frappeRequest("frappe.client.set_value", "POST", {
      doctype: "Opportunity",
      name: decodeURIComponent(id),
      fieldname: payload,
    })
    return NextResponse.json({ success: true, update })
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Unable to update opportunity." }, { status: 500 })
  }
}
