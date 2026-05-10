import { NextResponse } from 'next/server'
import { getAgenticEntitlement } from '@/plugins/agentic-ai/entitlements'
import { listPendingAgenticActions } from '@/plugins/agentic-ai/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const entitlement = await getAgenticEntitlement()
  if (!entitlement.allowed) {
    return NextResponse.json({ ok: false, error: entitlement.reason, items: [], total: 0 }, { status: 403 })
  }

  const result = await listPendingAgenticActions()
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, items: [], total: 0 }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    items: result.actions,
    total: result.actions.length,
  })
}

