/**
 * Tenant bootstrap helpers.
 *
 * Ensures the tenant has the minimum ERPNext records needed for Quotation
 * / Invoice / Sales Order creation:
 *   - A selling Price List
 *   - Selling Settings.selling_price_list pointing at it
 *   - Territories, Customer Groups, Item Groups, UOMs, etc.
 *
 * Authoritative path: the Python provisioning service's
 * `/api/v1/seed-defaults/:subdomain` endpoint. It runs inside the tenant's
 * Frappe bench with `ignore_permissions=True`, so it can create the Price
 * List and set Selling Settings regardless of what roles any tenant user
 * has. This avoids all the Frappe REST permission pitfalls (Price List
 * insert needs System Manager, etc.).
 *
 * One HTTP round-trip. Idempotent. Fast.
 *
 * Used by:
 *   - app/actions/user-auth.ts (lazy init on first login per tenant)
 *   - app/actions/crm.ts (createQuotation — self-heal if somehow missing)
 */

export interface EnsurePriceListResult {
  priceList: string
  created: boolean
  setAsDefault: boolean
  error?: string
  raw?: Record<string, unknown>
}

const DEFAULT_PRICE_LIST_NAME = 'Standard Selling'

/**
 * Ensure the tenant has a selling Price List + Selling Settings default.
 *
 * Delegates entirely to the provisioning service's seed-defaults endpoint,
 * which also seeds Territory / Customer Group / Item Group / UOM / etc.
 * The whole bootstrap is one HTTP call and takes well under a second in
 * steady state (much less than the former admin-key regeneration dance).
 */
export async function ensureSellingPriceList(
  subdomain: string,
  _currency: string = 'INR',
): Promise<EnsurePriceListResult> {
  const result: EnsurePriceListResult = {
    priceList: '',
    created: false,
    setAsDefault: false,
  }

  try {
    const { seedTenantDefaults } = await import('@/lib/provisioning-client')
    const seedResp = await seedTenantDefaults(subdomain)
    result.raw = seedResp?.result as unknown as Record<string, unknown>

    const plStatus = String(seedResp?.result?.price_list || '')
    const ssStatus = String(seedResp?.result?.selling_settings || '')

    // price_list field is e.g. "exists: Standard Selling" or "seeded: Standard Selling"
    const plMatch = plStatus.match(/^(?:exists|seeded):\s*(.+)$/)
    if (plMatch) {
      result.priceList = plMatch[1].trim()
      result.created = plStatus.startsWith('seeded')
    } else if (plStatus) {
      // Older provisioning service without price_list support.
      result.error = `provisioning seed-defaults did not return price_list (got "${plStatus || 'undefined'}"). The provisioning service needs to be updated.`
    } else {
      result.error = 'provisioning seed-defaults response missing price_list field (service is outdated — redeploy provisioning-service)'
    }

    if (ssStatus.startsWith('set default') || ssStatus.startsWith('already set')) {
      result.setAsDefault = true
    }

    if (!result.priceList && !result.error) {
      result.priceList = DEFAULT_PRICE_LIST_NAME
    }
  } catch (e: any) {
    result.error = `provisioning seed-defaults failed: ${e?.message || e}`
  }

  return result
}
