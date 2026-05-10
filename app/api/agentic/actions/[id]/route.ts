import { NextRequest, NextResponse } from 'next/server'
import { getAgenticEntitlement, getAgenticTenantContext } from '@/plugins/agentic-ai/entitlements'
import { claimPendingAgenticAction, getAgenticAction, setAgenticActionStatus } from '@/plugins/agentic-ai/audit'
import { executeMcpTool } from '@/plugins/agentic-ai/mcp/executor'
import type { MCPToolName } from '@/plugins/agentic-ai/mcp/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json().catch(() => ({})) as { approved?: boolean; reason?: string; approvedBy?: string }

  const entitlement = await getAgenticEntitlement()
  if (!entitlement.allowed) {
    return NextResponse.json({ ok: false, error: entitlement.reason }, { status: 403 })
  }

  if (!body.approved) {
    await setAgenticActionStatus(id, 'rejected', {
      rejected_reason: body.reason || 'Rejected from Agentic AI inbox',
      rejected_at: new Date().toISOString(),
    })
    return NextResponse.json({ ok: true, status: 'rejected' })
  }

  const claim = await claimPendingAgenticAction(id, body.approvedBy || 'current_user')
  if (!claim.ok || !claim.action) {
    return NextResponse.json({ ok: false, error: claim.error, conflict: claim.conflict }, { status: claim.conflict ? 409 : 400 })
  }

  const tenant = await getAgenticTenantContext()
  const action = await getAgenticAction(id)
  if (!action) {
    return NextResponse.json({ ok: false, error: 'Action not found after approval claim' }, { status: 404 })
  }

  const result = await executeMcpTool(tenant, {
    name: action.toolName as MCPToolName,
    input: action.payload,
  })

  await setAgenticActionStatus(id, result.ok ? 'executed' : 'failed', {
    result: JSON.stringify(result),
    executed_at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: result.ok, result }, { status: result.ok ? 200 : 500 })
}

