import { NextRequest, NextResponse } from 'next/server'
import { requireModuleAccess } from '@/app/api/_lib/auth'
import { frappeRequest } from '@/app/lib/api'
import { executeAgentTool } from '@/lib/agent/tools'
import type { AgentToolName } from '@/lib/agent/types'

type AgentLogDoc = {
  name: string
  payload: string
  tenant: string
}

function getTenantSiteName(tenant: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
  const isProd = process.env.NODE_ENV === 'production'
  const master = process.env.FRAPPE_SITE_NAME || 'erp.localhost'

  if (!tenant || tenant === 'master') return master
  return isProd ? `${tenant}.${rootDomain}` : `${tenant}.localhost`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireModuleAccess('agent-inbox')
  if (!auth.authorized) return auth.response

  try {
    const { id } = await params
    const body = await request.json()
    const approved = !!body.approved

    if (!id) {
      return NextResponse.json({ error: 'Missing action id' }, { status: 400 })
    }

    if (!approved) {
      await frappeRequest('frappe.client.set_value', 'POST', {
        doctype: 'Agent Action Log',
        name: id,
        fieldname: {
          status: 'rejected',
          approved_by: auth.userEmail,
          result: JSON.stringify({ rejectedAt: new Date().toISOString() }),
        },
      })

      return NextResponse.json({ success: true, status: 'rejected' })
    }

    const logDoc = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Agent Action Log',
      name: id,
    }) as AgentLogDoc

    const payload = JSON.parse(logDoc.payload || '{}') as {
      toolCall?: { name?: AgentToolName; input?: Record<string, unknown> }
    }

    const toolName = payload.toolCall?.name
    const toolInput = payload.toolCall?.input || {}

    if (!toolName) {
      return NextResponse.json({ error: 'Malformed action payload (missing toolCall.name)' }, { status: 400 })
    }

    const toolResult = await executeAgentTool(
      toolName,
      toolInput,
      {
        tenantId: logDoc.tenant,
        siteName: getTenantSiteName(logDoc.tenant),
      },
      { dryRun: false }
    )

    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Agent Action Log',
      name: id,
      fieldname: {
        status: toolResult.ok ? 'executed' : 'failed',
        approved_by: auth.userEmail,
        result: JSON.stringify({
          approvedAt: new Date().toISOString(),
          toolResult,
        }),
      },
    })

    return NextResponse.json({ success: true, status: toolResult.ok ? 'executed' : 'failed', toolResult })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Action execution failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
