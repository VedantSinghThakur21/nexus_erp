/**
 * Tenant bootstrap helpers.
 *
 * Idempotent, self-healing: ensures that a tenant has the minimum required
 * ERPNext records to create Quotations, Invoices and Sales Orders:
 *   - A selling Price List
 *   - Selling Settings.selling_price_list pointing at it
 *
 * IMPORTANT: Creating a Price List in ERPNext requires System Manager. A
 * regular tenant user's API keys will 403. We therefore use tenant-admin
 * credentials. Sources of admin creds, in order of preference:
 *
 *   1. `SaaS Tenant.api_key` / `api_secret` on the master record. These
 *      are the Administrator keys written during provisioning. They may
 *      have been overwritten by a user login elsewhere — if so, the call
 *      will 401/403 and we fall through to (2).
 *   2. Fresh keys generated on-demand via the provisioning service
 *      (`/api/v1/generate-user-keys` for user "Administrator"), which
 *      bypasses Frappe's System Manager restriction via
 *      ignore_permissions=True. Once regenerated we sync them back to the
 *      master record so future calls hit path (1).
 *
 * Used by:
 *   - app/actions/crm.ts (createQuotation — self-heal when price list missing)
 *   - app/actions/user-auth.ts (lazy init on first login per tenant)
 */

const BASE_URL = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
const MASTER_SITE_NAME = process.env.FRAPPE_SITE_NAME || 'erp.localhost'
const ERP_API_KEY = process.env.ERP_API_KEY
const ERP_API_SECRET = process.env.ERP_API_SECRET
const DEFAULT_PRICE_LIST_NAME = 'Standard Selling'
const REQUEST_TIMEOUT_MS = 20_000

export interface TenantAdminCreds {
  siteName: string
  apiKey: string
  apiSecret: string
  source: 'master-record' | 'provisioning-regen'
}

export interface EnsurePriceListResult {
  priceList: string
  created: boolean
  setAsDefault: boolean
  error?: string
  credSource?: TenantAdminCreds['source']
}

interface SaasTenantRecord {
  name?: string
  subdomain?: string
  site_url?: string
  api_key?: string
  api_secret?: string
}

/** Resolve the tenant's frappe site name (e.g. "testorg.avariq.in"). */
function resolveSiteName(subdomain: string, siteUrl?: string): string {
  if (siteUrl) {
    try {
      return new URL(siteUrl).host
    } catch { /* ignore */ }
  }
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
  return process.env.NODE_ENV === 'production'
    ? `${subdomain}.${rootDomain}`
    : `${subdomain}.localhost`
}

/** Fetch the SaaS Tenant master record (read-only). */
async function fetchSaasTenantRecord(subdomain: string): Promise<SaasTenantRecord | null> {
  if (!ERP_API_KEY || !ERP_API_SECRET) return null

  const authHeader = `token ${ERP_API_KEY}:${ERP_API_SECRET}`
  const url = `${BASE_URL}/api/method/frappe.client.get_list`
  const body = {
    doctype: 'SaaS Tenant',
    filters: JSON.stringify([['subdomain', '=', subdomain]]),
    fields: JSON.stringify(['name', 'subdomain', 'site_url', 'api_key', 'api_secret']),
    limit_page_length: 1,
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        'X-Frappe-Site-Name': MASTER_SITE_NAME,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) {
      console.warn(`[tenant-bootstrap] master get_list SaaS Tenant failed: ${res.status}`)
      return null
    }
    const data = await res.json()
    return (data?.message || [])[0] || null
  } catch (e: any) {
    console.warn(`[tenant-bootstrap] fetchSaasTenantRecord(${subdomain}) failed:`, e?.message || e)
    return null
  }
}

/** Persist fresh admin keys back to the SaaS Tenant master record. */
async function writeAdminKeysBackToMaster(
  tenantRecordName: string,
  apiKey: string,
  apiSecret: string,
): Promise<void> {
  if (!ERP_API_KEY || !ERP_API_SECRET || !tenantRecordName) return
  const authHeader = `token ${ERP_API_KEY}:${ERP_API_SECRET}`
  try {
    await fetch(`${BASE_URL}/api/method/frappe.client.set_value`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        'X-Frappe-Site-Name': MASTER_SITE_NAME,
      },
      body: JSON.stringify({
        doctype: 'SaaS Tenant',
        name: tenantRecordName,
        fieldname: 'api_key',
        value: apiKey,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    await fetch(`${BASE_URL}/api/method/frappe.client.set_value`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        'X-Frappe-Site-Name': MASTER_SITE_NAME,
      },
      body: JSON.stringify({
        doctype: 'SaaS Tenant',
        name: tenantRecordName,
        fieldname: 'api_secret',
        value: apiSecret,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    console.log(`[tenant-bootstrap] Synced fresh admin keys back to SaaS Tenant ${tenantRecordName}`)
  } catch (e: any) {
    console.warn(`[tenant-bootstrap] Failed to sync admin keys back: ${e?.message || e}`)
  }
}

/**
 * Make a tenant-site Frappe RPC using supplied admin credentials.
 * Returns null on auth failure so callers can fall back to regeneration.
 */
async function adminCall(
  creds: TenantAdminCreds,
  endpoint: string,
  method: 'GET' | 'POST',
  body: Record<string, unknown> | null = null,
): Promise<{ ok: true; data: unknown } | { ok: false; status: number; error: string }> {
  const url = `${BASE_URL}/api/method/${endpoint}`
  const authHeader = `token ${creds.apiKey}:${creds.apiSecret}`
  const init: RequestInit & { signal?: AbortSignal } = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
      'X-Frappe-Site-Name': creds.siteName,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }

  let res: Response
  try {
    if (method === 'GET' && body) {
      const params = new URLSearchParams()
      for (const [k, v] of Object.entries(body)) {
        params.append(k, typeof v === 'string' ? v : JSON.stringify(v))
      }
      res = await fetch(`${url}?${params.toString()}`, init)
    } else {
      init.body = body ? JSON.stringify(body) : undefined
      res = await fetch(url, init)
    }
  } catch (e: any) {
    return { ok: false, status: 0, error: `fetch failed: ${e?.message || e}` }
  }

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: `${endpoint} ${res.status}: ${JSON.stringify(json).slice(0, 300)}`,
    }
  }
  return { ok: true, data: (json as any).message ?? json }
}

/**
 * Resolve tenant-admin credentials, regenerating via provisioning service if needed.
 */
async function resolveAdminCreds(subdomain: string): Promise<TenantAdminCreds | null> {
  const record = await fetchSaasTenantRecord(subdomain)
  const siteName = resolveSiteName(subdomain, record?.site_url)
  const tenantRecordName = record?.name || subdomain

  // Path 1: try stored admin keys
  if (record?.api_key && record?.api_secret) {
    const candidate: TenantAdminCreds = {
      siteName,
      apiKey: record.api_key,
      apiSecret: record.api_secret,
      source: 'master-record',
    }
    // Probe: verify the keys authenticate AND the user has System Manager.
    // `frappe.auth.get_logged_user` is free of permission checks, so we
    // follow it with a System-Manager-only call to decide whether to keep
    // the stored keys or regenerate fresh Administrator keys.
    const authProbe = await adminCall(candidate, 'frappe.auth.get_logged_user', 'GET')
    if (authProbe.ok) {
      const loggedUser = typeof authProbe.data === 'string' ? authProbe.data : ''
      // System-Manager gate: reading Selling Settings requires it. Use a
      // cheap existence check on a doctype that tenant-user keys can't read.
      const permProbe = await adminCall(candidate, 'frappe.client.get_count', 'GET', {
        doctype: 'Price List',
      })
      if (permProbe.ok) return candidate
      console.warn(
        `[tenant-bootstrap] stored keys for ${subdomain} authenticate as "${loggedUser}" but lack Price List permission (${permProbe.status}). Regenerating Administrator keys.`,
      )
    } else {
      console.warn(
        `[tenant-bootstrap] stored admin keys for ${subdomain} failed auth probe (${authProbe.status}). Regenerating Administrator keys.`,
      )
    }
  } else {
    console.warn(`[tenant-bootstrap] No admin keys stored for ${subdomain}. Regenerating via provisioning service.`)
  }

  // Path 2: regenerate Administrator keys via provisioning service
  try {
    const { generateUserApiKeys } = await import('@/lib/provisioning-client')
    const fresh = await generateUserApiKeys(subdomain, 'Administrator', 30_000)
    if (fresh?.api_key && fresh?.api_secret) {
      // Persist back so next time Path 1 works.
      void writeAdminKeysBackToMaster(tenantRecordName, fresh.api_key, fresh.api_secret)
      return {
        siteName,
        apiKey: fresh.api_key,
        apiSecret: fresh.api_secret,
        source: 'provisioning-regen',
      }
    }
  } catch (e: any) {
    console.warn(
      `[tenant-bootstrap] generateUserApiKeys(${subdomain}, Administrator) failed: ${e?.message || e}`,
    )
  }

  return null
}

/**
 * Ensure a selling Price List exists and is set as the Selling Settings default
 * for the given tenant. Never throws; returns a result object with details.
 *
 * Idempotent: safe to call repeatedly.
 */
export async function ensureSellingPriceList(
  subdomain: string,
  currency: string = 'INR',
): Promise<EnsurePriceListResult> {
  const result: EnsurePriceListResult = {
    priceList: '',
    created: false,
    setAsDefault: false,
  }

  const creds = await resolveAdminCreds(subdomain)
  if (!creds) {
    result.error = 'Could not resolve tenant admin credentials (no stored keys and provisioning regen failed)'
    return result
  }
  result.credSource = creds.source

  // 1. Price List exists?
  const existingRes = await adminCall(creds, 'frappe.client.get_list', 'GET', {
    doctype: 'Price List',
    filters: '[["selling","=","1"],["enabled","=","1"]]',
    fields: '["name"]',
    limit_page_length: 1,
  })
  if (existingRes.ok) {
    const existing = existingRes.data as { name: string }[] | undefined
    if (existing?.[0]?.name) result.priceList = existing[0].name
  } else {
    console.warn('[tenant-bootstrap] get_list Price List failed:', existingRes.error)
  }

  // 2. Create if missing.
  if (!result.priceList) {
    const createRes = await adminCall(creds, 'frappe.client.insert', 'POST', {
      doc: {
        doctype: 'Price List',
        price_list_name: DEFAULT_PRICE_LIST_NAME,
        selling: 1,
        buying: 0,
        enabled: 1,
        currency,
      },
    })
    if (createRes.ok) {
      const created = createRes.data as { name: string } | undefined
      result.priceList = created?.name || DEFAULT_PRICE_LIST_NAME
      result.created = true
    } else if (
      createRes.error.includes('Duplicate') ||
      createRes.error.includes('already exists')
    ) {
      result.priceList = DEFAULT_PRICE_LIST_NAME
    } else {
      result.error = `create Price List failed: ${createRes.error}`
      return result
    }
  }

  // 3. Selling Settings default.
  const getDefaultRes = await adminCall(creds, 'frappe.client.get_value', 'GET', {
    doctype: 'Selling Settings',
    fieldname: 'selling_price_list',
  })
  const current = getDefaultRes.ok ? (getDefaultRes.data as { selling_price_list?: string } | null) : null
  if (!current?.selling_price_list) {
    const setRes = await adminCall(creds, 'frappe.client.set_value', 'POST', {
      doctype: 'Selling Settings',
      name: 'Selling Settings',
      fieldname: 'selling_price_list',
      value: result.priceList,
    })
    if (setRes.ok) {
      result.setAsDefault = true
    } else {
      result.error = result.error
        ? `${result.error}; set default failed: ${setRes.error}`
        : `set default failed: ${setRes.error}`
    }
  }

  return result
}
