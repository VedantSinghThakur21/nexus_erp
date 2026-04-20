import { NextResponse } from 'next/server'
import { requireModuleAccess } from '@/app/api/_lib/auth'
import { isAgentActionLogUnavailableError, serverFrappeCall } from '@/lib/agent/server-frappe'

type AgentLogRow = {
  name: string
  tenant: string
  action_type: string
  status: string
  triggered_by: string
  approved_by?: string
  creation: string
  modified: string
  payload: string
  result?: string
}

export async function GET(request: Request) {
  const auth = await requireModuleAccess('agent-inbox')
  if (!auth.authorized) return auth.response

  try {
    const url = new URL(request.url)
    const limit = Math.min(Number(url.searchParams.get('limit') || '25'), 100)

    const rows = await serverFrappeCall<AgentLogRow[]>('frappe.client.get_list', 'GET', {
      doctype: 'Agent Action Log',
      fields: '["name","tenant","action_type","status","triggered_by","approved_by","creation","modified","payload","result"]',
      filters: JSON.stringify([["status", "=", "pending_approval"]]),
      order_by: 'creation desc',
      limit_page_length: limit,
    })

    return NextResponse.json({
      items: rows,
      total: rows.length,
    })
  } catch (error) {
    if (isAgentActionLogUnavailableError(error)) {
      return NextResponse.json({
        items: [],
        total: 0,
        warning: 'Agent inbox is unavailable on this tenant (DocType missing or permission not granted).',
      })
    }

    const message = error instanceof Error ? error.message : 'Failed to load inbox'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
