import { NextResponse } from 'next/server'
import { getAgenticEntitlement, getAgenticTenantContext } from '@/plugins/agentic-ai/entitlements'
import { getAgenticTools } from '@/plugins/agentic-ai/orchestrator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const entitlement = await getAgenticEntitlement()
  const tenant = await getAgenticTenantContext()
  const tools = entitlement.allowed ? await getAgenticTools() : []

  return NextResponse.json({
    ...entitlement,
    siteName: tenant.siteName,
    tools,
  })
}

