import { NextResponse } from 'next/server'
import { withTimingHeaders } from '@/lib/api/with-timing'
import {
  evaluateAgenticEntitlement,
  getAgenticTenantContext,
} from '@/plugins/agentic-ai/entitlements'
import { getAgenticTools } from '@/plugins/agentic-ai/orchestrator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const started = performance.now()
  const tenant = await getAgenticTenantContext()
  const entitlement = evaluateAgenticEntitlement(tenant)
  const tools = entitlement.allowed ? await getAgenticTools() : []

  const res = NextResponse.json({
    ...entitlement,
    siteName: tenant.siteName,
    tools,
  })
  res.headers.set(
    'Cache-Control',
    'private, max-age=0, s-maxage=30, stale-while-revalidate=120',
  )
  return withTimingHeaders(res, started)
}

