import { NextResponse } from 'next/server'
import { requireAgenticEntitlement } from '@/lib/agentic/api-helpers'
import { withAgenticHeaders } from '@/lib/agentic/response-headers'
import { clearTenantRagIndex } from '@/plugins/agentic-ai/rag/indexer'
import { ensureTenantRagIndexed } from '@/plugins/agentic-ai/rag/erp-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Force refresh tenant ERP documents in the RAG index. */
export async function POST() {
  const gate = await requireAgenticEntitlement()
  if (!gate.ok) return gate.response

  const tenantId = gate.entitlement.tenantId
  clearTenantRagIndex(tenantId)

  const result = await ensureTenantRagIndexed(tenantId, {
    includeFinance: Boolean(gate.entitlement.flags.agentic_finance_enabled),
  })

  return withAgenticHeaders(
    NextResponse.json({
      ok: true,
      tenantId,
      indexed: result.indexed,
      fromCache: result.fromCache,
    })
  )
}
