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

export async function getWarehouses() {
  try {
    const warehouseList = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Warehouse',
      fields: '["name"]',
      limit_page_length: 50
    })
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
}) {
  try {
    const result = await frappeRequest('erpnext.stock.get_item_details.get_item_details', 'POST', {
      item_code: data.item_code,
      company: data.company || 'ASP Cranes',
      customer: data.customer,
      qty: data.qty,
      transaction_date: data.transaction_date
    })

    return {
      success: true,
      data: {
        price_list_rate: result?.price_list_rate,
        discount_percentage: result?.discount_percentage,
        pricing_rules: result?.pricing_rules,
        uom: result?.uom,
        item_name: result?.item_name,
        description: result?.description
      }
    }
  } catch (error) {
    console.error('Failed to apply pricing rules:', error)
    return { success: false, error: 'Failed to apply pricing rules' }
  }
}
