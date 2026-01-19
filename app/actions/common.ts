'use server'

import { frappeRequest } from "@/app/lib/api"

export async function getTaxTemplates() {
  try {
    const templates = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Sales Taxes and Charges Template',
      fields: '["name", "title"]',
      limit_page_length: 50
    })
    return templates || []
  } catch (error) {
    console.error('Failed to fetch tax templates:', error)
    return []
  }
}

export async function getTaxTemplateDetails(templateName: string) {
  try {
    const template = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Taxes and Charges Template',
      name: templateName
    })
    return template
  } catch (error) {
    console.error('Failed to fetch tax template details:', error)
    return null
  }
}

export async function getWarehouses() {
  try {
    const warehouseList = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Warehouse',
      fields: '["name"]',
      limit_page_length: 50
    }) as any[]
    return warehouseList?.map((w: any) => w.name) || []
  } catch (error) {
    console.error('Failed to fetch warehouses:', error)
    return []
  }
}

export async function applyItemPricingRules(data: {
  item_code: string
  customer?: string
  qty: number
  transaction_date: string
  company?: string
  is_rental?: boolean
  rental_components?: {
    base_cost?: number
    accommodation_charges?: number
    usage_charges?: number
    fuel_charges?: number
    elongation_charges?: number
    risk_charges?: number
    commercial_charges?: number
    incidental_charges?: number
    other_charges?: number
  }
}) {
  try {
    const result = await frappeRequest('erpnext.stock.get_item_details.get_item_details', 'POST', {
      item_code: data.item_code,
      company: data.company || 'ASP Cranes',
      customer: data.customer,
      qty: data.qty,
      transaction_date: data.transaction_date
    })

    // If this is a rental item and pricing rules are applied, adjust rental components proportionally
    let adjustedRentalComponents = data.rental_components
    if (data.is_rental && data.rental_components && result?.discount_percentage) {
      const discountMultiplier = 1 - (result.discount_percentage / 100)
      adjustedRentalComponents = {
        base_cost: (data.rental_components.base_cost || 0) * discountMultiplier,
        accommodation_charges: (data.rental_components.accommodation_charges || 0) * discountMultiplier,
        usage_charges: (data.rental_components.usage_charges || 0) * discountMultiplier,
        fuel_charges: (data.rental_components.fuel_charges || 0) * discountMultiplier,
        elongation_charges: (data.rental_components.elongation_charges || 0) * discountMultiplier,
        risk_charges: (data.rental_components.risk_charges || 0) * discountMultiplier,
        commercial_charges: (data.rental_components.commercial_charges || 0) * discountMultiplier,
        incidental_charges: (data.rental_components.incidental_charges || 0) * discountMultiplier,
        other_charges: (data.rental_components.other_charges || 0) * discountMultiplier,
      }
    }

    return {
      success: true,
      data: {
        price_list_rate: result?.price_list_rate,
        discount_percentage: result?.discount_percentage,
        pricing_rules: result?.pricing_rules,
        uom: result?.uom,
        item_name: result?.item_name,
        description: result?.description,
        adjusted_rental_components: adjustedRentalComponents
      }
    }
  } catch (error) {
    console.error('Failed to apply pricing rules:', error)
    return { success: false, error: 'Failed to apply pricing rules' }
  }
}
