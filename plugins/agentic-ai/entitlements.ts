import { cookies, headers } from 'next/headers'
import { AGENTIC_ALLOWED_PLANS, AGENTIC_BASE_FLAG, normalizePlan } from './config'
import type { AgenticEntitlement, AgenticFeatureFlag, AgenticPlan, AgenticTenantContext } from './types'

type TenantPlanRow = {
  name?: string
  plan?: string
  status?: string
  agentic_ai_enabled?: 0 | 1 | boolean
  agentic_finance_enabled?: 0 | 1 | boolean
  agentic_destructive_tools_enabled?: 0 | 1 | boolean
}

function boolFlag(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'Yes'
}

function parseEnabledTenantsEnv(flag: AgenticFeatureFlag): string[] {
  const key = `AGENTIC_${flag.toUpperCase()}_TENANTS`
  return (process.env[key] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function siteNameForTenant(tenantId: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
  const master = process.env.FRAPPE_SITE_NAME || 'erp.localhost'
  if (!tenantId || tenantId === 'master') return master
  return process.env.NODE_ENV === 'production' ? `${tenantId}.${rootDomain}` : `${tenantId}.localhost`
}

async function getRequestTenantId(): Promise<string> {
  const headerStore = await headers()
  const cookieStore = await cookies()
  return (
    headerStore.get('x-tenant-id') ||
    headerStore.get('x-subdomain') ||
    cookieStore.get('tenant_subdomain')?.value ||
    'master'
  )
}

async function fetchTenantPlanRow(tenantId: string): Promise<TenantPlanRow | null> {
  if (!tenantId || tenantId === 'master') {
    return {
      name: 'master',
      plan: 'enterprise',
      status: 'active',
      agentic_ai_enabled: true,
      agentic_finance_enabled: true,
      agentic_destructive_tools_enabled: true,
    }
  }

  const baseUrl = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
  const apiKey = process.env.ERP_API_KEY
  const apiSecret = process.env.ERP_API_SECRET
  if (!apiKey || !apiSecret) return null

  const headersBase = {
    'Content-Type': 'application/json',
    'Authorization': `token ${apiKey}:${apiSecret}`,
    'X-Frappe-Site-Name': process.env.FRAPPE_SITE_NAME || 'erp.localhost',
  }

  async function query(fields: string[]) {
    const response = await fetch(`${baseUrl}/api/method/frappe.client.get_list`, {
      method: 'POST',
      headers: headersBase,
      body: JSON.stringify({
        doctype: 'Tenant',
        filters: { subdomain: tenantId },
        fields,
        limit_page_length: 1,
      }),
      cache: 'no-store',
    })

    if (!response.ok) return null
    const data = await response.json().catch(() => ({})) as { message?: TenantPlanRow[] }
    return data.message?.[0] || null
  }

  // Try custom feature flag fields first; older tenants may not have them yet.
  return (
    await query(['name', 'plan', 'status', 'agentic_ai_enabled', 'agentic_finance_enabled', 'agentic_destructive_tools_enabled'])
  ) || (await query(['name', 'plan', 'status']))
}

function buildFlags(tenantId: string, row: TenantPlanRow | null): Partial<Record<AgenticFeatureFlag, boolean>> {
  const flags: Partial<Record<AgenticFeatureFlag, boolean>> = {
    agentic_ai_enabled: boolFlag(row?.agentic_ai_enabled),
    agentic_finance_enabled: boolFlag(row?.agentic_finance_enabled),
    agentic_destructive_tools_enabled: boolFlag(row?.agentic_destructive_tools_enabled),
  }

  for (const flag of Object.keys(flags) as AgenticFeatureFlag[]) {
    if (!flags[flag] && parseEnabledTenantsEnv(flag).includes(tenantId)) {
      flags[flag] = true
    }
  }

  if (tenantId === 'master') {
    flags.agentic_ai_enabled = true
    flags.agentic_finance_enabled = true
    flags.agentic_destructive_tools_enabled = true
  }

  return flags
}

export async function getAgenticTenantContext(): Promise<AgenticTenantContext> {
  const tenantId = await getRequestTenantId()
  const row = await fetchTenantPlanRow(tenantId)
  const plan = normalizePlan(row?.plan)

  return {
    tenantId,
    siteName: siteNameForTenant(tenantId),
    plan,
    status: row?.status,
    flags: buildFlags(tenantId, row),
  }
}

export function evaluateAgenticEntitlement(context: AgenticTenantContext): AgenticEntitlement {
  if (!AGENTIC_ALLOWED_PLANS.includes(context.plan)) {
    return {
      allowed: false,
      plan: context.plan,
      tenantId: context.tenantId,
      flags: context.flags,
      reason: 'Agentic AI requires a Pro or Enterprise plan.',
    }
  }

  if (!context.flags[AGENTIC_BASE_FLAG]) {
    return {
      allowed: false,
      plan: context.plan,
      tenantId: context.tenantId,
      flags: context.flags,
      reason: 'Agentic AI is not enabled for this tenant.',
    }
  }

  return {
    allowed: true,
    plan: context.plan,
    tenantId: context.tenantId,
    flags: context.flags,
  }
}

export async function getAgenticEntitlement(): Promise<AgenticEntitlement> {
  return evaluateAgenticEntitlement(await getAgenticTenantContext())
}

export function canUseAgenticTool(
  context: Pick<AgenticTenantContext, 'plan' | 'flags'>,
  requiredPlan: Extract<AgenticPlan, 'pro' | 'enterprise'>,
  requiredFlag?: AgenticFeatureFlag
): { allowed: boolean; reason?: string } {
  const planRank: Record<AgenticPlan, number> = { free: 0, pro: 1, enterprise: 2 }
  if (planRank[context.plan] < planRank[requiredPlan]) {
    return { allowed: false, reason: `This tool requires the ${requiredPlan} plan.` }
  }

  if (requiredFlag && !context.flags[requiredFlag]) {
    return { allowed: false, reason: `This tool requires ${requiredFlag}.` }
  }

  return { allowed: true }
}

