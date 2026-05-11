import {
  normalizePlan,
  normalizeSubscriptionStatus,
  toProvisioningPlanType,
  type PlanSource,
  type SubscriptionStatus,
  type SubscriptionTier,
} from '@/types/subscription'

type FrappeEnvelope<T> = {
  message?: T
  data?: T
  exc_type?: string
  exception?: string
  _server_messages?: string
}

export type SaasTenantRow = {
  name: string
  subdomain?: string
  company_name?: string
  owner_email?: string
  plan_type?: string
  subscription_status?: string
  status?: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
}

export type OrganizationRow = {
  name: string
  organization_name?: string
  slug?: string
  owner_email?: string
  subscription_plan?: string
  subscription_status?: string
  agentic_ai_enabled?: 0 | 1 | boolean
  agentic_finance_enabled?: 0 | 1 | boolean
  agentic_destructive_tools_enabled?: 0 | 1 | boolean
  plan_synced_at?: string
  plan_source?: PlanSource
  stripe_customer_id?: string
  stripe_subscription_id?: string
}

export type PlanAuditInput = {
  subdomain: string
  organization?: string
  fromPlan?: string | null
  toPlan: SubscriptionTier
  fromStatus?: string | null
  toStatus: SubscriptionStatus
  source: PlanSource
  changedBy?: string
  reason?: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
}

function masterHeaders(): Record<string, string> {
  const apiKey = process.env.ERP_API_KEY
  const apiSecret = process.env.ERP_API_SECRET
  if (!apiKey || !apiSecret) {
    throw new Error('ERP_API_KEY/ERP_API_SECRET are required for subscription sync')
  }

  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `token ${apiKey}:${apiSecret}`,
    'X-Frappe-Site-Name': process.env.FRAPPE_SITE_NAME || 'erp.localhost',
  }
}

export async function masterFrappeCall<T>(
  endpoint: string,
  payload: Record<string, unknown>,
  method: 'GET' | 'POST' = 'POST'
): Promise<T> {
  const baseUrl = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
  const url = new URL(`${baseUrl}/api/method/${endpoint}`)

  if (method === 'GET') {
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === null) continue
      url.searchParams.set(key, typeof value === 'string' ? value : JSON.stringify(value))
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers: masterHeaders(),
    body: method === 'POST' ? JSON.stringify(payload) : undefined,
    cache: 'no-store',
  })

  const data = (await response.json().catch(() => ({}))) as FrappeEnvelope<T> & Record<string, unknown>
  if (!response.ok) {
    const message = typeof data.exception === 'string'
      ? data.exception
      : typeof data._server_messages === 'string'
        ? data._server_messages
        : `Frappe request failed with status ${response.status}`
    throw new Error(message)
  }

  return (data.message ?? data.data ?? data) as T
}

/** Columns that may be blocked on `get_list` but are readable via `frappe.client.get`. */
const SAAS_TENANT_DOC_FIELDS: (keyof SaasTenantRow)[] = [
  'subdomain',
  'company_name',
  'owner_email',
  'plan_type',
  'subscription_status',
  'status',
  'stripe_customer_id',
  'stripe_subscription_id',
]

function mergeSaasTenantFromDoc(row: SaasTenantRow, doc: Record<string, unknown>): SaasTenantRow {
  const merged: SaasTenantRow = { ...row }
  for (const key of SAAS_TENANT_DOC_FIELDS) {
    const v = doc[key as string]
    if (typeof v === 'string') {
      ;(merged as Record<string, string>)[key] = v
    }
  }
  return merged
}

/**
 * Frappe may restrict which columns `get_list` returns on custom DocTypes (plan_type,
 * stripe_customer_id, etc.). Resolve the row by `name` from a minimal list, then load
 * the full document via `frappe.client.get`.
 */
async function enrichSaasTenantFromDoc(row: SaasTenantRow): Promise<SaasTenantRow> {
  try {
    const doc = await masterFrappeCall<Record<string, unknown>>(
      'frappe.client.get',
      { doctype: 'SaaS Tenant', name: row.name },
      'GET'
    )
    return mergeSaasTenantFromDoc(row, doc)
  } catch {
    return row
  }
}

export async function getSaasTenantBySubdomain(subdomain: string): Promise<SaasTenantRow | null> {
  const rows = await masterFrappeCall<Pick<SaasTenantRow, 'name'>[]>('frappe.client.get_list', {
    doctype: 'SaaS Tenant',
    filters: { subdomain },
    fields: ['name'],
    limit_page_length: 1,
  })

  const row = rows[0]
  if (!row?.name) return null

  let tenant = await enrichSaasTenantFromDoc({ name: row.name, subdomain })

  if (!tenant.stripe_customer_id?.trim() || !tenant.stripe_subscription_id?.trim()) {
    try {
      const org = await getOrganizationBySlug(subdomain)
      if (org) {
        tenant = {
          ...tenant,
          stripe_customer_id: tenant.stripe_customer_id || org.stripe_customer_id,
          stripe_subscription_id: tenant.stripe_subscription_id || org.stripe_subscription_id,
        }
      }
    } catch {
      // ignore — portal/sync callers may still use SaaS doc only
    }
  }

  return tenant
}

function docCheckbox(doc: Record<string, unknown>, key: string): 0 | 1 | boolean | undefined {
  const v = doc[key]
  if (typeof v === 'boolean') return v
  if (v === 0 || v === 1) return v
  if (v === '0' || v === '1') return v === '1' ? 1 : 0
  return undefined
}

const ORG_STRING_FIELDS = [
  'organization_name',
  'slug',
  'owner_email',
  'subscription_plan',
  'subscription_status',
  'plan_synced_at',
  'stripe_customer_id',
  'stripe_subscription_id',
] as const satisfies readonly (keyof OrganizationRow)[]

function mergeOrganizationFromDoc(row: OrganizationRow, doc: Record<string, unknown>): OrganizationRow {
  const merged: OrganizationRow = { ...row }
  for (const key of ORG_STRING_FIELDS) {
    const v = doc[key as string]
    if (typeof v === 'string') {
      ;(merged as unknown as Record<string, string>)[key] = v
    }
  }

  const src = doc.plan_source
  if (typeof src === 'string' && (src === 'saas_tenant' || src === 'stripe' || src === 'manual')) {
    merged.plan_source = src
  }

  const ai = docCheckbox(doc, 'agentic_ai_enabled')
  if (ai !== undefined) merged.agentic_ai_enabled = ai
  const fin = docCheckbox(doc, 'agentic_finance_enabled')
  if (fin !== undefined) merged.agentic_finance_enabled = fin
  const dest = docCheckbox(doc, 'agentic_destructive_tools_enabled')
  if (dest !== undefined) merged.agentic_destructive_tools_enabled = dest

  return merged
}

/**
 * Same pattern as SaaS Tenant: `get_list` may forbid sensitive columns (e.g. agentic_ai_enabled).
 * Resolve by `name` then load the full doc with `frappe.client.get`.
 */
async function enrichOrganizationFromDoc(row: OrganizationRow): Promise<OrganizationRow> {
  try {
    const doc = await masterFrappeCall<Record<string, unknown>>(
      'frappe.client.get',
      { doctype: 'Organization', name: row.name },
      'GET'
    )
    return mergeOrganizationFromDoc(row, doc)
  } catch {
    return row
  }
}

export async function getOrganizationBySlug(slug: string): Promise<OrganizationRow | null> {
  const rows = await masterFrappeCall<Pick<OrganizationRow, 'name'>[]>('frappe.client.get_list', {
    doctype: 'Organization',
    filters: { slug },
    fields: ['name'],
    limit_page_length: 1,
  })

  const row = rows[0]
  if (!row?.name) return null
  return enrichOrganizationFromDoc({ ...row, slug })
}

export async function upsertOrganizationMirror(input: {
  subdomain: string
  organizationName?: string
  ownerEmail?: string
  plan: SubscriptionTier
  status: SubscriptionStatus
  source: PlanSource
  agenticAiEnabled?: boolean
  stripeCustomerId?: string
  stripeSubscriptionId?: string
}): Promise<OrganizationRow | null> {
  const existing = await getOrganizationBySlug(input.subdomain)
  const syncedAt = new Date().toISOString()
  const fieldname = {
    subscription_plan: input.plan,
    subscription_status: input.status,
    plan_synced_at: syncedAt,
    plan_source: input.source,
    agentic_ai_enabled: input.agenticAiEnabled ? 1 as const : 0 as const,
    ...(input.stripeCustomerId ? { stripe_customer_id: input.stripeCustomerId } : {}),
    ...(input.stripeSubscriptionId ? { stripe_subscription_id: input.stripeSubscriptionId } : {}),
  }

  if (existing?.name) {
    await masterFrappeCall('frappe.client.set_value', {
      doctype: 'Organization',
      name: existing.name,
      fieldname,
    })
    return { ...existing, ...fieldname, plan_synced_at: syncedAt }
  }

  try {
    const created = await masterFrappeCall<OrganizationRow>('frappe.client.insert', {
      doc: {
        doctype: 'Organization',
        organization_name: input.organizationName || input.subdomain,
        slug: input.subdomain,
        owner_email: input.ownerEmail || '',
        usage_users: 1,
        usage_leads: 0,
        usage_projects: 0,
        usage_invoices: 0,
        usage_storage: 0,
        ...fieldname,
      },
    })
    return created
  } catch (error) {
    console.warn('[Subscription] Could not create Organization mirror:', error)
    return null
  }
}

export async function writePlanAudit(input: PlanAuditInput): Promise<void> {
  const payload = {
    subdomain: input.subdomain,
    organization: input.organization,
    from_plan: input.fromPlan || '',
    to_plan: input.toPlan,
    from_status: input.fromStatus || '',
    to_status: input.toStatus,
    source: input.source,
    changed_by: input.changedBy || 'system',
    reason: input.reason || '',
    stripe_customer_id: input.stripeCustomerId || '',
    stripe_subscription_id: input.stripeSubscriptionId || '',
    changed_at: new Date().toISOString(),
  }

  try {
    await masterFrappeCall('frappe.client.insert', {
      doc: {
        doctype: 'Plan Change Audit',
        ...payload,
      },
    })
  } catch {
    await masterFrappeCall('frappe.client.insert', {
      doc: {
        doctype: 'Comment',
        comment_type: 'Info',
        reference_doctype: 'SaaS Tenant',
        reference_name: input.subdomain,
        content: `Plan changed from ${payload.from_plan || 'unknown'} to ${payload.to_plan} (${payload.to_status}) via ${payload.source}`,
      },
    }).catch(() => undefined)
  }
}

export async function syncSubscriptionFromSaasTenant(input: {
  subdomain: string
  source?: PlanSource
  statusOverride?: SubscriptionStatus
  changedBy?: string
  reason?: string
}): Promise<{
  tenant: SaasTenantRow
  organization: OrganizationRow | null
  plan: SubscriptionTier
  status: SubscriptionStatus
}> {
  const tenant = await getSaasTenantBySubdomain(input.subdomain)
  if (!tenant) throw new Error(`SaaS Tenant not found for subdomain ${input.subdomain}`)

  const existingOrg = await getOrganizationBySlug(input.subdomain)
  const plan = normalizePlan(tenant.plan_type ?? existingOrg?.subscription_plan)
  const status =
    input.statusOverride ||
    normalizeSubscriptionStatus(
      tenant.subscription_status || tenant.status || existingOrg?.subscription_status || 'active'
    )
  const organization = await upsertOrganizationMirror({
    subdomain: input.subdomain,
    organizationName: tenant.company_name,
    ownerEmail: tenant.owner_email,
    plan,
    status,
    source: input.source || 'saas_tenant',
    agenticAiEnabled: plan === 'pro' || plan === 'enterprise',
    stripeCustomerId: tenant.stripe_customer_id,
    stripeSubscriptionId: tenant.stripe_subscription_id,
  })

  if (
    normalizePlan(existingOrg?.subscription_plan) !== plan ||
    normalizeSubscriptionStatus(existingOrg?.subscription_status) !== status
  ) {
    await writePlanAudit({
      subdomain: input.subdomain,
      organization: organization?.name || existingOrg?.name,
      fromPlan: existingOrg?.subscription_plan,
      toPlan: plan,
      fromStatus: existingOrg?.subscription_status,
      toStatus: status,
      source: input.source || 'saas_tenant',
      changedBy: input.changedBy,
      reason: input.reason || 'subscription_sync',
      stripeCustomerId: tenant.stripe_customer_id,
      stripeSubscriptionId: tenant.stripe_subscription_id,
    })
  }

  return { tenant, organization, plan, status }
}

export async function updateSaasTenantPlan(input: {
  subdomain: string
  plan: SubscriptionTier
  status: SubscriptionStatus
  source: PlanSource
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  changedBy?: string
  reason?: string
}): Promise<void> {
  const tenant = await getSaasTenantBySubdomain(input.subdomain)
  if (!tenant) throw new Error(`SaaS Tenant not found for subdomain ${input.subdomain}`)

  await masterFrappeCall('frappe.client.set_value', {
    doctype: 'SaaS Tenant',
    name: tenant.name,
    fieldname: {
      plan_type: toProvisioningPlanType(input.plan),
      subscription_status: input.status,
      ...(input.stripeCustomerId ? { stripe_customer_id: input.stripeCustomerId } : {}),
      ...(input.stripeSubscriptionId ? { stripe_subscription_id: input.stripeSubscriptionId } : {}),
    },
  })

  const organization = await upsertOrganizationMirror({
    subdomain: input.subdomain,
    organizationName: tenant.company_name,
    ownerEmail: tenant.owner_email,
    plan: input.plan,
    status: input.status,
    source: input.source,
    agenticAiEnabled: input.plan === 'pro' || input.plan === 'enterprise',
    stripeCustomerId: input.stripeCustomerId || tenant.stripe_customer_id,
    stripeSubscriptionId: input.stripeSubscriptionId || tenant.stripe_subscription_id,
  })

  await writePlanAudit({
    subdomain: input.subdomain,
    organization: organization?.name,
    fromPlan: normalizePlan(tenant.plan_type),
    toPlan: input.plan,
    fromStatus: tenant.subscription_status || tenant.status,
    toStatus: input.status,
    source: input.source,
    changedBy: input.changedBy,
    reason: input.reason,
    stripeCustomerId: input.stripeCustomerId || tenant.stripe_customer_id,
    stripeSubscriptionId: input.stripeSubscriptionId || tenant.stripe_subscription_id,
  })
}

