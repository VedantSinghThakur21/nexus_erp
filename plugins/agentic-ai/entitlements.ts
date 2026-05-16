import { cookies, headers } from 'next/headers'
import { getCachedEntitlement, setCachedEntitlement } from '@/lib/cache/entitlement-cache'
import { dedupeInFlight } from '@/lib/performance/in-flight-dedupe'
import { getOrganizationBySlug, getSaasTenantBySubdomain } from '@/lib/subscription/master'
import { AGENTIC_ALLOWED_PLANS, AGENTIC_BASE_FLAG, getModelPolicy } from './config'
import { normalizePlan } from '@/types/subscription'
import type { AgenticEntitlement, AgenticFeatureFlag, AgenticPlan, AgenticTenantContext } from './types'

type TenantPlanRow = {
  name?: string
  plan_type?: string
  subscription_plan?: string
  subscription_status?: string
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
      plan_type: 'Enterprise',
      status: 'active',
      agentic_ai_enabled: true,
      agentic_finance_enabled: true,
      agentic_destructive_tools_enabled: true,
    }
  }

  return dedupeInFlight(`tenant-plan-row:${tenantId}`, async () => {
    if (!process.env.ERP_API_KEY || !process.env.ERP_API_SECRET) return null

    const [saas, orgRow] = await Promise.all([
      getSaasTenantBySubdomain(tenantId),
      getOrganizationBySlug(tenantId),
    ])

    const org: TenantPlanRow | null = orgRow
      ? {
          name: orgRow.name,
          subscription_plan: orgRow.subscription_plan,
          subscription_status: orgRow.subscription_status,
          agentic_ai_enabled: orgRow.agentic_ai_enabled,
          agentic_finance_enabled: orgRow.agentic_finance_enabled,
          agentic_destructive_tools_enabled: orgRow.agentic_destructive_tools_enabled,
        }
      : null

    const tenantWide: TenantPlanRow | null = saas
      ? {
          name: saas.name,
          plan_type: saas.plan_type,
          status: saas.status,
          subscription_status: saas.subscription_status,
        }
      : null

    const tenant = tenantWide

    return tenant ? { ...tenant, ...org } : org
  })
}

function buildFlags(tenantId: string, row: TenantPlanRow | null): Partial<Record<AgenticFeatureFlag, boolean>> {
  const plan = normalizePlan(row?.subscription_plan || row?.plan_type)
  const planUnlocksAgentic = plan === 'pro' || plan === 'enterprise'
  const explicitAi = row?.agentic_ai_enabled
  const raw = explicitAi as unknown
  const explicitlyOff =
    explicitAi === 0 ||
    explicitAi === false ||
    raw === '0' ||
    raw === 'No'

  let agenticAi = boolFlag(row?.agentic_ai_enabled)
  if (planUnlocksAgentic) {
    // Paid plan: default ON when the field is missing from API reads; only an explicit off disables.
    agenticAi = !explicitlyOff
  }

  const flags: Partial<Record<AgenticFeatureFlag, boolean>> = {
    agentic_ai_enabled: agenticAi,
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
  const plan = normalizePlan(row?.subscription_plan || row?.plan_type)

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
  const tenantId = await getRequestTenantId()
  const hit = getCachedEntitlement(tenantId)
  if (hit) return hit

  const entitlement = evaluateAgenticEntitlement(await getAgenticTenantContext())
  setCachedEntitlement(tenantId, entitlement)
  return entitlement
}

export async function getEntitlement(orgId?: string): Promise<{
  allowed: boolean
  plan: AgenticPlan
  reason: 'upgrade_required' | 'feature_flag_disabled' | null
  model: string | null
}> {
  const tenantContext = orgId
    ? await (async () => {
        const [base, row] = await Promise.all([
          getAgenticTenantContext(),
          fetchTenantPlanRow(orgId),
        ])
        return {
          ...base,
          tenantId: orgId,
          flags: buildFlags(orgId, row),
          plan: normalizePlan(row?.subscription_plan || row?.plan_type) as AgenticPlan,
        }
      })()
    : await getAgenticTenantContext()

  if (!AGENTIC_ALLOWED_PLANS.includes(tenantContext.plan)) {
    return {
      allowed: false,
      plan: tenantContext.plan,
      reason: 'upgrade_required',
      model: null,
    }
  }

  if (!tenantContext.flags[AGENTIC_BASE_FLAG]) {
    return {
      allowed: false,
      plan: tenantContext.plan,
      reason: 'feature_flag_disabled',
      model: null,
    }
  }

  return {
    allowed: true,
    plan: tenantContext.plan,
    reason: null,
    model: getModelPolicy(tenantContext.plan).model,
  }
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

