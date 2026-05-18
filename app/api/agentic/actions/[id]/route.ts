import { NextRequest, NextResponse } from 'next/server'
import { isAgentActionLogUnavailableError } from '@/lib/agent/server-frappe'
import { withAgenticHeaders } from '@/lib/agentic/response-headers'
import {
  actionIdSchema,
  agenticActionSchema,
  enforceAgenticRateLimit,
  requireAgenticEntitlement,
} from '@/lib/agentic/api-helpers'
import { getAgenticTenantContext } from '@/plugins/agentic-ai/entitlements'
import {
  AGENT_ACTION_LOG_SETUP_NOTICE,
  claimPendingAgenticAction,
  getAgenticAction,
  setAgenticActionStatusIfAvailable,
  writeAudit,
} from '@/plugins/agentic-ai/audit'
import { executeMcpTool } from '@/plugins/agentic-ai/mcp/executor'
import { getMcpTool } from '@/plugins/agentic-ai/mcp/registry'
import type { MCPToolName } from '@/plugins/agentic-ai/mcp/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const gate = await requireAgenticEntitlement()
  if (!gate.ok) return gate.response

  const rateLimited = await enforceAgenticRateLimit('actions', gate.entitlement.tenantId)
  if (rateLimited) return rateLimited

  const { id: rawId } = await params
  const idParsed = actionIdSchema.safeParse(rawId)
  if (!idParsed.success) {
    return withAgenticHeaders(
      NextResponse.json({ error: 'Invalid action id', code: 'VALIDATION_ERROR' }, { status: 400 })
    )
  }
  const id = idParsed.data

  const bodyParsed = agenticActionSchema.safeParse(await request.json().catch(() => ({})))
  if (!bodyParsed.success) {
    return withAgenticHeaders(
      NextResponse.json({ error: 'Invalid request body', code: 'VALIDATION_ERROR' }, { status: 400 })
    )
  }
  const body = bodyParsed.data

  if (!body.approved) {
    const rejected = await setAgenticActionStatusIfAvailable(id, 'rejected', {
      rejected_reason: body.reason || 'Rejected from Agentic AI inbox',
      rejected_at: new Date().toISOString(),
    })
    if (!rejected.ok) {
      return withAgenticHeaders(
        NextResponse.json(
          { error: AGENT_ACTION_LOG_SETUP_NOTICE, code: 'SETUP_REQUIRED' },
          { status: 503 }
        )
      )
    }
    await writeAudit(
      {
        tenantId: gate.entitlement.tenantId,
        userId: body.approvedBy || 'current_user',
        runId: id,
        event: 'action.rejected',
        outcome: 'success',
        payload: { reason: body.reason },
      },
      gate.entitlement.tenantId
    ).catch(() => undefined)
    return withAgenticHeaders(NextResponse.json({ ok: true, status: 'rejected' }))
  }

  const claim = await claimPendingAgenticAction(id, body.approvedBy || 'current_user')
  if (claim.setupRequired) {
    return withAgenticHeaders(
      NextResponse.json(
        { error: claim.error || AGENT_ACTION_LOG_SETUP_NOTICE, code: 'SETUP_REQUIRED' },
        { status: 503 }
      )
    )
  }
  if (!claim.ok || !claim.action) {
    return withAgenticHeaders(
      NextResponse.json(
        {
          error: claim.error || 'Already actioned by another approver',
          code: claim.conflict ? 'CONFLICT' : 'ACTION_ERROR',
        },
        { status: claim.conflict ? 409 : 400 }
      )
    )
  }

  const tenant = await getAgenticTenantContext()
  let action
  try {
    action = await getAgenticAction(id)
  } catch (error) {
    if (isAgentActionLogUnavailableError(error)) {
      return withAgenticHeaders(
        NextResponse.json(
          { error: AGENT_ACTION_LOG_SETUP_NOTICE, code: 'SETUP_REQUIRED' },
          { status: 503 }
        )
      )
    }
    throw error
  }

  if (!action) {
    return withAgenticHeaders(
      NextResponse.json({ error: 'Action not found', code: 'NOT_FOUND' }, { status: 404 })
    )
  }

  const tool = getMcpTool(action.toolName as MCPToolName)
  if (!tool) {
    return withAgenticHeaders(
      NextResponse.json({ error: 'Unknown tool', code: 'TOOL_ERROR' }, { status: 400 })
    )
  }

  const result = await executeMcpTool(tenant, {
    name: action.toolName as MCPToolName,
    input: action.payload,
  })

  const persisted = await setAgenticActionStatusIfAvailable(id, result.success ? 'executed' : 'failed', {
    result: JSON.stringify(result.data ?? result.error),
    executed_at: new Date().toISOString(),
  })

  await writeAudit(
    {
      tenantId: tenant.tenantId,
      userId: body.approvedBy || 'current_user',
      runId: id,
      event: 'action.executed',
      toolName: action.toolName,
      classification: tool.classification,
      payload: { success: result.success },
      outcome: result.success ? 'success' : 'failure',
    },
    tenant.tenantId
  ).catch(() => undefined)

  return withAgenticHeaders(
    NextResponse.json(
      {
        ok: result.success,
        result,
        ...(persisted.ok ? {} : { setupRequired: true, notice: AGENT_ACTION_LOG_SETUP_NOTICE }),
      },
      { status: result.success ? 200 : 500 }
    )
  )
}
