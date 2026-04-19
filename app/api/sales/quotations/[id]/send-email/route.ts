import { NextRequest, NextResponse } from "next/server"
import { requireActionPermission } from "@/app/api/_lib/auth"
import { frappeRequest } from "@/app/lib/api"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireActionPermission("quotations", "edit")
  if (!auth.authorized) return auth.response

  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const quotationId = decodeURIComponent(id)
    const quotation = await frappeRequest("frappe.client.get", "GET", {
      doctype: "Quotation",
      name: quotationId,
    }) as any

    const recipients = body?.recipientEmail || quotation?.contact_email || quotation?.email_id
    if (!recipients) {
      return NextResponse.json({ message: "Recipient email is required." }, { status: 400 })
    }

    await frappeRequest("frappe.core.doctype.communication.email.make_email_queue", "POST", {
      doctype: "Quotation",
      name: quotationId,
      recipients,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Unable to send quotation email." }, { status: 500 })
  }
}
