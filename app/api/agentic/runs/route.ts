import { NextRequest, NextResponse } from 'next/server'
import { withAgenticHeaders } from '@/lib/agentic/response-headers'
import {
  agenticRunSchema,
  enforceAgenticRateLimit,
  requireAgenticEntitlement,
} from '@/lib/agentic/api-helpers'
import { createAgenticRun, runAgenticWorkflow } from '@/plugins/agentic-ai/orchestrator'
import type { MCPToolCall } from '@/plugins/agentic-ai/mcp/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const gate = await requireAgenticEntitlement()
  if (!gate.ok) return gate.response

  const rateLimited = await enforceAgenticRateLimit('runs', gate.entitlement.tenantId)
  if (rateLimited) return rateLimited

  const parsed = agenticRunSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return withAgenticHeaders(
      NextResponse.json({ error: 'Invalid request body', code: 'VALIDATION_ERROR' }, { status: 400 })
    )
  }

  try {
    if (parsed.data.toolCall) {
      const result = await createAgenticRun({
        toolCall: parsed.data.toolCall as MCPToolCall,
        requestedBy: parsed.data.requestedBy,
      })
      return withAgenticHeaders(NextResponse.json(result, { status: result.ok ? 200 : result.status || 500 }))
    }

    const workflow = await runAgenticWorkflow({
      mode: parsed.data.mode,
      userMessage: parsed.data.message,
      tenantId: gate.entitlement.tenantId,
      userId: parsed.data.requestedBy || 'current_user',
      conversationHistory: [],
      entitlement: gate.entitlement,
    })

    return withAgenticHeaders(NextResponse.json({ ok: true, result: workflow }))
  } catch {
    console.error('[agentic] run failed', { tenantId: gate.entitlement.tenantId })
    return withAgenticHeaders(
      NextResponse.json({ error: 'Run failed', code: 'RUN_ERROR' }, { status: 500 })
    )
  }
}
