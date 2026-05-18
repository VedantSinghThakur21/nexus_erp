import { NextResponse } from 'next/server'
import { withTimingHeaders } from '@/lib/api/with-timing'
import { withAgenticHeaders } from '@/lib/agentic/response-headers'
import { requireAgenticEntitlement } from '@/lib/agentic/api-helpers'
import { AGENT_ACTION_LOG_SETUP_NOTICE, listPendingAgenticActions } from '@/plugins/agentic-ai/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const started = performance.now()
  const gate = await requireAgenticEntitlement()
  if (!gate.ok) return gate.response

  const result = await listPendingAgenticActions()
  if (result.setupRequired) {
    return NextResponse.json({
      ok: true,
      items: [],
      total: 0,
      setupRequired: true,
      notice: AGENT_ACTION_LOG_SETUP_NOTICE,
    })
  }
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, items: [], total: 0 }, { status: 500 })
  }

  const res = withAgenticHeaders(
    NextResponse.json({
      ok: true,
      items: result.actions,
      total: result.actions.length,
    })
  )
  res.headers.set('Cache-Control', 'private, no-store')
  return withTimingHeaders(res, started)
}

