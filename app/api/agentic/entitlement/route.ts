import { NextResponse } from 'next/server'
import { withTimingHeaders } from '@/lib/api/with-timing'
import { withAgenticHeaders } from '@/lib/agentic/response-headers'
import { requireAgenticEntitlement } from '@/lib/agentic/api-helpers'
import { registry } from '@/plugins/agentic-ai/mcp/registry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const started = performance.now()
  const gate = await requireAgenticEntitlement()
  if (!gate.ok) {
    const body = await gate.response.json().catch(() => ({ allowed: false }))
    return withTimingHeaders(withAgenticHeaders(NextResponse.json(body, { status: gate.response.status })), started)
  }

  const entitlement = gate.entitlement
  const allTools = registry.all()
  const entitled = registry.listEntitled(entitlement)

  const res = withAgenticHeaders(
    NextResponse.json({
      allowed: true,
      plan: entitlement.plan,
      tenantId: entitlement.tenantId,
      flags: entitlement.flags,
      enabledTools: entitled.map((t) => t.name),
      lockedTools: allTools
        .filter((t) => !entitled.find((e) => e.name === t.name))
        .map((t) => ({
          name: t.name,
          requiredPlan: t.requiredPlan,
          requiredFlag: t.requiredFlag,
        })),
    })
  )
  res.headers.set('Cache-Control', 'private, max-age=0, s-maxage=30, stale-while-revalidate=120')
  return withTimingHeaders(res, started)
}
