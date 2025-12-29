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

      // Map rental data to ERPNext custom fields if present (from frontend or quotation)
      if (item.rental_type || item.rental_duration || item.custom_is_rental || item.custom_rental_type) {
        baseItem.custom_is_rental = 1
        // Capitalize rental_type for ERPNext Select field (days -> Days, hours -> Hours, months -> Months)
        const rentalType = item.rental_type || item.custom_rental_type
        if (rentalType && typeof rentalType === 'string') {
          baseItem.custom_rental_type = rentalType.charAt(0).toUpperCase() + rentalType.slice(1)
        }
        baseItem.custom_rental_duration = item.rental_duration || item.custom_rental_duration
        baseItem.custom_rental_start_date = item.rental_start_date || item.custom_rental_start_date
        baseItem.custom_rental_end_date = item.rental_end_date || item.custom_rental_end_date
        baseItem.custom_rental_start_time = item.rental_start_time || item.custom_rental_start_time
        baseItem.custom_rental_end_time = item.rental_end_time || item.custom_rental_end_time
        baseItem.custom_requires_operator = item.requires_operator || item.custom_requires_operator ? 1 : 0
        baseItem.custom_operator_included = item.operator_included || item.custom_operator_included ? 1 : 0
        if (item.operator_name || item.custom_operator_name) {
          baseItem.custom_operator_name = item.operator_name || item.custom_operator_name
        }
        
        // Map pricing components to ERPNext custom fields
        baseItem.custom_base_rental_cost = item.base_cost || item.custom_base_rental_cost || 0
        baseItem.custom_accommodation_charges = item.accommodation_charges || item.custom_accommodation_charges || 0
        baseItem.custom_usage_charges = item.usage_charges || item.custom_usage_charges || 0
        baseItem.custom_fuel_charges = item.fuel_charges || item.custom_fuel_charges || 0
        baseItem.custom_elongation_charges = item.elongation_charges || item.custom_elongation_charges || 0
        baseItem.custom_risk_charges = item.risk_charges || item.custom_risk_charges || 0
        baseItem.custom_commercial_charges = item.commercial_charges || item.custom_commercial_charges || 0
        baseItem.custom_incidental_charges = item.incidental_charges || item.custom_incidental_charges || 0
        baseItem.custom_other_charges = item.other_charges || item.custom_other_charges || 0
        baseItem.custom_total_rental_cost = item.total_rental_cost || item.custom_total_rental_cost || 0
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
    if (data.po_date) orderData.po_date = data.po_date
    
    // Add tax template if specified
    if (data.taxes_and_charges) {
      orderData.taxes_and_charges = data.taxes_and_charges
      
      try {
        // Fetch the tax template to get the tax rows
        const taxTemplate = await frappeRequest('frappe.client.get', 'GET', {
          doctype: 'Sales Taxes and Charges Template',
          name: data.taxes_and_charges
        })
        
        // Add the tax rows to the sales order
        if (taxTemplate.taxes && taxTemplate.taxes.length > 0) {
          orderData.taxes = taxTemplate.taxes.map((tax: any, idx: number) => ({
            idx: idx + 1,
            doctype: 'Sales Taxes and Charges',
            charge_type: tax.charge_type,
            account_head: tax.account_head,
            description: tax.description,
            rate: tax.rate
          }))
        }
      } catch (taxError) {
        console.error('Error fetching tax template:', taxError)
        // Continue without taxes if template fetch fails
      }
    }

    console.log('Creating Sales Order with data:', JSON.stringify(orderData, null, 2))
    const result = await frappeRequest({
      method: 'POST',
      endpoint: '/resource/Sales Order',
      body: orderData
    })
    
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
