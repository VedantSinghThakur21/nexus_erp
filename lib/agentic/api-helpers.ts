import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AGENTIC_CONFIG } from '@/plugins/agentic-ai/config'
import { getAgenticEntitlement, getAgenticTenantContext } from '@/plugins/agentic-ai/entitlements'
import { rateLimit } from '@/lib/rate-limit'
import { withAgenticHeaders } from '@/lib/agentic/response-headers'

export async function requireAgenticTenant(): Promise<
  | { ok: true; tenantId: string }
  | { ok: false; response: NextResponse }
> {
  const tenant = await getAgenticTenantContext()
  if (!tenant.tenantId) {
    return {
      ok: false,
      response: withAgenticHeaders(
        NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
      ),
    }
  }
  return { ok: true, tenantId: tenant.tenantId }
}

export async function requireAgenticEntitlement(): Promise<
  | { ok: true; entitlement: Awaited<ReturnType<typeof getAgenticEntitlement>> & { allowed: true } }
  | { ok: false; response: NextResponse }
> {
  const auth = await requireAgenticTenant()
  if (!auth.ok) return auth

  const entitlement = await getAgenticEntitlement()
  if (!entitlement.allowed) {
    const reason =
      entitlement.reason?.includes('plan') ? 'plan_required' : 'flag_disabled'
    return {
      ok: false,
      response: withAgenticHeaders(
        NextResponse.json({ allowed: false, reason }, { status: 403 })
      ),
    }
  }

  return { ok: true, entitlement: entitlement as typeof entitlement & { allowed: true } }
}

export async function enforceAgenticRateLimit(
  bucket: keyof typeof AGENTIC_CONFIG.rateLimits,
  tenantId: string
): Promise<NextResponse | null> {
  const { requests, windowMs } = AGENTIC_CONFIG.rateLimits[bucket]
  const { allowed } = await rateLimit(`${bucket}:${tenantId}`, requests, windowMs)
  if (!allowed) {
    return withAgenticHeaders(
      NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMIT' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    )
  }
  return null
}

export const agenticMessageSchema = z.object({
  message: z.string().min(1).max(8000),
  mode: z.enum(['chat', 'plan', 'act']).optional(),
})

export const agenticRunSchema = z.object({
  mode: z.enum(['plan', 'act']),
  message: z.string().min(1).max(8000),
  toolCall: z
    .object({
      name: z.string().min(1).max(140),
      input: z.record(z.string(), z.unknown()),
    })
    .optional(),
  requestedBy: z.string().max(140).optional(),
})

export const agenticActionSchema = z.object({
  approved: z.boolean(),
  reason: z.string().max(500).optional(),
  approvedBy: z.string().max(140).optional(),
})

export const actionIdSchema = z.string().min(1).max(140)
