/**
 * Tenant bootstrap helpers.
 *
 * Idempotent, self-healing: ensures that a tenant has the minimum required
 * ERPNext records to create Quotations, Invoices and Sales Orders:
 *   - A selling Price List
 *   - Selling Settings.selling_price_list pointing at it
 *
 * IMPORTANT: Creating a Price List in ERPNext requires System Manager. A
 * regular tenant user's API keys will 403. These helpers therefore resolve
 * the tenant-admin API keys stored on the SaaS Tenant master record and
 * call the tenant site directly with admin auth.
 *
 * Used by:
 *   - app/actions/crm.ts (createQuotation — self-heal when price list missing)
 *   - app/actions/user-auth.ts (lazy init on first login per tenant)
 *   - app/api/setup/init/route.ts may also import these helpers
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
}

export interface EnsurePriceListResult {
  priceList: string
  created: boolean
  setAsDefault: boolean
  error?: string
}

/**
 * Resolve the tenant's site name (e.g. "testorg.avariq.in") and admin API
 * keys from the SaaS Tenant master record. Returns null if the tenant is
 * unknown or the credentials are missing.
 */
export async function getTenantAdminCreds(
  subdomain: string,
): Promise<TenantAdminCreds | null> {
  if (!ERP_API_KEY || !ERP_API_SECRET) {
    console.warn('[tenant-bootstrap] ERP_API_KEY / ERP_API_SECRET not set — cannot resolve tenant admin creds')
    return null
  }

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
    const rec = (data?.message || [])[0]
    if (!rec) return null

    const apiKey: string | undefined = rec.api_key
    const apiSecret: string | undefined = rec.api_secret
    if (!apiKey || !apiSecret) {
      console.warn(`[tenant-bootstrap] SaaS Tenant ${subdomain} has no admin api_key/api_secret synced`)
      return null
    }

    // Prefer the configured site_url's host (strip scheme) when present, else
    // fall back to subdomain.ROOT_DOMAIN.
    let siteName = ''
    if (typeof rec.site_url === 'string' && rec.site_url) {
      try {
        const u = new URL(rec.site_url)
        siteName = u.host
      } catch { /* ignore parse err */ }
    }
    if (!siteName) {
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
      siteName = process.env.NODE_ENV === 'production'
        ? `${subdomain}.${rootDomain}`
        : `${subdomain}.localhost`
    }

    return { siteName, apiKey, apiSecret }
  } catch (e: any) {
    console.warn(`[tenant-bootstrap] getTenantAdminCreds(${subdomain}) failed:`, e?.message || e)
    return null
  }
}

/** Make a tenant-site Frappe RPC using admin credentials. */
async function adminCall(
  creds: TenantAdminCreds,
  endpoint: string,
  method: 'GET' | 'POST',
  body: Record<string, unknown> | null = null,
): Promise<unknown> {
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
  if (method === 'GET' && body) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(body)) {
      params.append(k, typeof v === 'string' ? v : JSON.stringify(v))
    }
    const res = await fetch(`${url}?${params.toString()}`, init)
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(`${endpoint} ${res.status}: ${JSON.stringify(json).slice(0, 300)}`)
    }
    return json.message ?? json
  } else {
    init.body = body ? JSON.stringify(body) : undefined
    const res = await fetch(url, init)
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(`${endpoint} ${res.status}: ${JSON.stringify(json).slice(0, 300)}`)
    }
    return json.message ?? json
  }
}

/**
 * Ensure a selling Price List exists and is set as the Selling Settings default
 * for the given tenant. Requires tenant-admin credentials — fetched from the
 * SaaS Tenant master record. Never throws; returns a result object.
 *
 * Idempotent: safe to call on every login or quotation creation.
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

  const creds = await getTenantAdminCreds(subdomain)
  if (!creds) {
    result.error = 'Tenant admin credentials not found on master record'
    return result
  }

  // 1. Does a selling Price List already exist?
  try {
    const existing = (await adminCall(creds, 'frappe.client.get_list', 'GET', {
      doctype: 'Price List',
      filters: '[["selling","=","1"],["enabled","=","1"]]',
      fields: '["name"]',
      limit_page_length: 1,
    })) as { name: string }[]
    if (existing?.[0]?.name) {
      result.priceList = existing[0].name
    }
  } catch (e: any) {
    // Non-fatal — will attempt create below
    console.warn('[tenant-bootstrap] get_list Price List failed:', e?.message || e)
  }

  // 2. If not, create one using admin credentials.
  if (!result.priceList) {
    try {
      const created = (await adminCall(creds, 'frappe.client.insert', 'POST', {
        doc: {
          doctype: 'Price List',
          price_list_name: DEFAULT_PRICE_LIST_NAME,
          selling: 1,
          buying: 0,
          enabled: 1,
          currency,
        },
      })) as { name: string }
      result.priceList = created.name || DEFAULT_PRICE_LIST_NAME
      result.created = true
    } catch (e: any) {
      const msg = String(e?.message || '')
      if (msg.includes('Duplicate') || msg.includes('already exists')) {
        result.priceList = DEFAULT_PRICE_LIST_NAME
      } else {
        result.error = `create Price List failed: ${msg}`
        return result
      }
    }
  }

  // 3. Ensure Selling Settings default is set.
  try {
    const current = (await adminCall(creds, 'frappe.client.get_value', 'GET', {
      doctype: 'Selling Settings',
      fieldname: 'selling_price_list',
    })) as { selling_price_list?: string } | null

    if (!current?.selling_price_list) {
      await adminCall(creds, 'frappe.client.set_value', 'POST', {
        doctype: 'Selling Settings',
        name: 'Selling Settings',
        fieldname: 'selling_price_list',
        value: result.priceList,
      })
      result.setAsDefault = true
    }
  } catch (e: any) {
    result.error = result.error
      ? `${result.error}; set default failed: ${e.message || e}`
      : `set default failed: ${e.message || e}`
  }

  return result
}
