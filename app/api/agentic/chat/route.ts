import { NextRequest, NextResponse } from 'next/server'
import { withAgenticHeaders } from '@/lib/agentic/response-headers'
import {
  agenticMessageSchema,
  enforceAgenticRateLimit,
  requireAgenticEntitlement,
} from '@/lib/agentic/api-helpers'
import { runAgenticChat } from '@/plugins/agentic-ai/orchestrator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const gate = await requireAgenticEntitlement()
  if (!gate.ok) return gate.response

  const rateLimited = await enforceAgenticRateLimit('chat', gate.entitlement.tenantId)
  if (rateLimited) return rateLimited

  const parsed = agenticMessageSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return withAgenticHeaders(
      NextResponse.json({ error: 'Invalid request body', code: 'VALIDATION_ERROR' }, { status: 400 })
    )
  }

  try {
    const result = await runAgenticChat({
      message: parsed.data.message,
      mode: parsed.data.mode || 'chat',
    })
    if (!result.ok) {
      return withAgenticHeaders(
        NextResponse.json(
          { error: result.error || 'Chat failed', code: 'CHAT_ERROR' },
          { status: result.status || 500 }
        )
      )
    }
    return withAgenticHeaders(NextResponse.json(result))
  } catch {
    console.error('[agentic] chat failed', { tenantId: gate.entitlement.tenantId })
    return withAgenticHeaders(
      NextResponse.json({ error: 'Chat request failed', code: 'CHAT_ERROR' }, { status: 500 })
    )
  }
}
