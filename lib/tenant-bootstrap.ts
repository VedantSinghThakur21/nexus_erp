/**
 * Tenant bootstrap helpers.
 *
 * Idempotent, self-healing ensures that a tenant has the minimum required
 * ERPNext records to create Quotations, Invoices and Sales Orders:
 *   - A selling Price List
 *   - Selling Settings.selling_price_list pointing at it
 *
 * These helpers are safe to call repeatedly — they check first and only
 * create what's missing. They never throw for "already exists" conditions.
 *
 * Used by:
 *   - app/actions/crm.ts (createQuotation — self-heal when price list missing)
 *   - app/api/setup/init/route.ts (one-shot tenant init endpoint)
 *   - app/actions/user-auth.ts (lazy init on first login per tenant)
 */
import { frappeRequest } from '@/app/lib/api'

const DEFAULT_PRICE_LIST_NAME = 'Standard Selling'

export interface EnsurePriceListResult {
  priceList: string
  created: boolean
  setAsDefault: boolean
  error?: string
}

/**
 * Ensure a selling Price List exists and is set as the Selling Settings default.
 * Returns the resolved price-list name. Never throws — returns an error string
 * on the result object if bootstrap could not complete.
 */
export async function ensureSellingPriceList(
  currency: string = 'INR'
): Promise<EnsurePriceListResult> {
  const result: EnsurePriceListResult = {
    priceList: '',
    created: false,
    setAsDefault: false,
  }

  // 1. Does a selling Price List already exist?
  try {
    const existing = (await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Price List',
      filters: '[["selling","=","1"],["enabled","=","1"]]',
      fields: '["name"]',
      limit_page_length: 1,
    })) as { name: string }[]

    if (existing?.[0]?.name) {
      result.priceList = existing[0].name
    }
  } catch (e: any) {
    result.error = `get Price List failed: ${e.message || e}`
  }

  // 2. If not, create one.
  if (!result.priceList) {
    try {
      const created = (await frappeRequest('frappe.client.insert', 'POST', {
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
      // If it was a duplicate (race), just fall back to the known name
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
    const current = (await frappeRequest('frappe.client.get_value', 'GET', {
      doctype: 'Selling Settings',
      fieldname: 'selling_price_list',
    })) as { selling_price_list?: string } | null

    if (!current?.selling_price_list) {
      await frappeRequest('frappe.client.set_value', 'POST', {
        doctype: 'Selling Settings',
        name: 'Selling Settings',
        fieldname: 'selling_price_list',
        value: result.priceList,
      })
      result.setAsDefault = true
    }
  } catch (e: any) {
    // Non-fatal: quotation can still reference the price list explicitly.
    result.error = result.error
      ? `${result.error}; set default failed: ${e.message || e}`
      : `set default failed: ${e.message || e}`
  }

  return result
}
