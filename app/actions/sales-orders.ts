'use server'

import { frappeRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"

export interface SalesOrder {
  name: string
  customer: string
  customer_name?: string
  status: string // Draft | To Deliver and Bill | To Bill | To Deliver | Completed | Cancelled | On Hold
  transaction_date: string
  delivery_date?: string
  grand_total: number
  currency: string
  items: SalesOrderItem[]
  per_delivered?: number
  per_billed?: number
  quotation_no?: string
  opportunity?: string
  total_qty?: number
  net_total?: number
  total_taxes_and_charges?: number
}

export interface SalesOrderItem {
  item_code: string
  item_name?: string
  description?: string
  qty: number
  uom: string
  rate: number
  amount: number
  discount_percentage?: number
  delivered_qty?: number
}

// ========== SALES ORDERS ==========

// 1. READ: Get All Sales Orders
export async function getSalesOrders() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Sales Order',
        fields: '["name", "customer", "customer_name", "status", "transaction_date", "delivery_date", "grand_total", "currency", "total_qty", "per_delivered", "per_billed"]',
        order_by: 'creation desc',
        limit_page_length: 100
      }
    )
    return response as SalesOrder[]
  } catch (error) {
    console.error("Failed to fetch sales orders:", error)
    return []
  }
}

// 2. READ: Get Single Sales Order
export async function getSalesOrder(id: string) {
  try {
    const order = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Order',
      name: decodeURIComponent(id)
    })
    return order as SalesOrder
  } catch (error) {
    console.error("Failed to fetch sales order:", error)
    return null
  }
}

// 3. CREATE: Create New Sales Order
export async function createSalesOrder(data: any) {
  try {
    // Process items to preserve rental data if present
    const processedItems = (data.items || []).map((item: any) => {
      const baseItem: any = {
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description,
        qty: item.qty,
        uom: item.uom || 'Nos',
        rate: item.rate,
        amount: item.amount,
        delivery_date: item.delivery_date || data.delivery_date
      }

      // Preserve rental data from quotation if present
      if (item.custom_rental_data || item.custom_is_rental) {
        baseItem.custom_rental_data = item.custom_rental_data
        baseItem.custom_is_rental = item.custom_is_rental
        baseItem.custom_rental_type = item.custom_rental_type
        baseItem.custom_rental_duration = item.custom_rental_duration
        baseItem.custom_rental_start_date = item.custom_rental_start_date
        baseItem.custom_rental_end_date = item.custom_rental_end_date
        baseItem.custom_rental_start_time = item.custom_rental_start_time
        baseItem.custom_rental_end_time = item.custom_rental_end_time
        baseItem.custom_operator_included = item.custom_operator_included
        
        // Preserve all pricing components
        baseItem.custom_base_rental_cost = item.custom_base_rental_cost
        baseItem.custom_accommodation_charges = item.custom_accommodation_charges
        baseItem.custom_usage_charges = item.custom_usage_charges
        baseItem.custom_fuel_charges = item.custom_fuel_charges
        baseItem.custom_elongation_charges = item.custom_elongation_charges
        baseItem.custom_risk_charges = item.custom_risk_charges
        baseItem.custom_commercial_charges = item.custom_commercial_charges
        baseItem.custom_incidental_charges = item.custom_incidental_charges
        baseItem.custom_other_charges = item.custom_other_charges
        baseItem.custom_total_rental_cost = item.custom_total_rental_cost
      }

      return baseItem
    })

    const orderData: any = {
      doctype: 'Sales Order',
      customer: data.customer,
      transaction_date: data.transaction_date || new Date().toISOString().split('T')[0],
      delivery_date: data.delivery_date,
      currency: data.currency || 'USD',
      items: processedItems
    }

    // Add optional fields
    if (data.customer_name) orderData.customer_name = data.customer_name
    if (data.quotation_no) orderData.quotation_no = data.quotation_no
    if (data.opportunity) orderData.opportunity = data.opportunity
    if (data.contact_email) orderData.contact_email = data.contact_email
    if (data.territory) orderData.territory = data.territory
    if (data.terms) orderData.terms = data.terms
    if (data.po_no) orderData.po_no = data.po_no

    const result = await frappeRequest('frappe.client.insert', 'POST', orderData)
    
    revalidatePath('/sales-orders')
    return { success: true, data: result }
  } catch (error: any) {
    console.error("Failed to create sales order:", error)
    return { error: error.message || 'Failed to create sales order' }
  }
}

// 4. UPDATE: Update Sales Order
export async function updateSalesOrder(id: string, data: any) {
  try {
    const result = await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Sales Order',
      name: id,
      fieldname: data
    })
    
    revalidatePath('/sales-orders')
    revalidatePath(`/sales-orders/${id}`)
    return { success: true, data: result }
  } catch (error: any) {
    console.error("Failed to update sales order:", error)
    return { error: error.message || 'Failed to update sales order' }
  }
}

// 5. SUBMIT: Submit Sales Order
export async function submitSalesOrder(id: string) {
  try {
    await frappeRequest('frappe.client.submit', 'POST', {
      doctype: 'Sales Order',
      name: id
    })
    
    revalidatePath('/sales-orders')
    revalidatePath(`/sales-orders/${id}`)
    return { success: true }
  } catch (error: any) {
    console.error("Failed to submit sales order:", error)
    return { error: error.message || 'Failed to submit sales order' }
  }
}

// 6. CANCEL: Cancel Sales Order
export async function cancelSalesOrder(id: string) {
  try {
    await frappeRequest('frappe.client.cancel', 'POST', {
      doctype: 'Sales Order',
      name: id
    })
    
    revalidatePath('/sales-orders')
    revalidatePath(`/sales-orders/${id}`)
    return { success: true }
  } catch (error: any) {
    console.error("Failed to cancel sales order:", error)
    return { error: error.message || 'Failed to cancel sales order' }
  }
}

// 7. GET: Get Sales Order Statistics
export async function getSalesOrderStats() {
  try {
    const orders = await getSalesOrders()
    
    const stats = {
      draft: orders.filter(o => o.status === 'Draft').length,
      confirmed: orders.filter(o => ['To Deliver and Bill', 'To Bill', 'To Deliver'].includes(o.status)).length,
      inProgress: orders.filter(o => o.status === 'To Deliver and Bill' && (o.per_delivered || 0) > 0 && (o.per_delivered || 0) < 100).length,
      totalValue: orders.reduce((sum, o) => sum + (o.grand_total || 0), 0)
    }
    
    return stats
  } catch (error) {
    console.error("Failed to fetch sales order stats:", error)
    return { draft: 0, confirmed: 0, inProgress: 0, totalValue: 0 }
  }
}

// 8. CREATE: Create Sales Order from Quotation
export async function createSalesOrderFromQuotation(quotationId: string) {
  try {
    const result = await frappeRequest('erpnext.selling.doctype.quotation.quotation.make_sales_order', 'POST', {
      source_name: quotationId
    })
    
    revalidatePath('/sales-orders')
    revalidatePath('/quotations')
    return { success: true, data: result }
  } catch (error: any) {
    console.error("Failed to create sales order from quotation:", error)
    return { error: error.message || 'Failed to create sales order from quotation' }
  }
}
