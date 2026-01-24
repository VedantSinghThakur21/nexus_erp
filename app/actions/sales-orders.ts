'use server'

/**
 * ============================================================================
 * PRODUCTION-GRADE SALES ORDER TO INVOICE WORKFLOW
 * ERPNext Integration for Nexus ERP SaaS
 * ============================================================================
 *
 * STATUS MAPPING (ERPNext fields)
 *
 * ERPNext exposes two related, user-facing fields on Sales Order:
 * - `delivery_status`: Not Delivered | Partly Delivered | Fully Delivered | Closed | Not Applicable
 * - `billing_status`: Not Billed | Partly Billed | Fully Billed | Closed
 *
 * Internally ERPNext also calculates `per_delivered` and `per_billed` (0-100%). The combined
 * values determine `status` (eg. "To Deliver and Bill", "To Bill", "To Deliver", "Completed").
 *
 * Key mappings we use for eligibility:
 * - Fully billed: `billing_status === 'Fully Billed'` OR `per_billed >= 100`
 * - No delivery required (services): `delivery_status === 'Not Applicable'` → can invoice based on billing
 * - Deliveries present: require `per_delivered > 0` (or `delivery_status` != 'Not Delivered') to create invoice
 * - Terminal states: `Cancelled`, `On Hold`, `Closed` → never eligible
 *
 * INVOICE ELIGIBILITY RULES:
 * ✓ Can invoice: billing_status != 'Fully Billed' AND (delivery_status !== 'Not Delivered' OR delivery_status === 'Not Applicable')
 * ✗ Cannot invoice: billing_status = 'Fully Billed' OR per_billed >= 100
 * ✗ Cannot invoice: status in ['Draft', 'Cancelled', 'On Hold', 'Closed'] or docstatus != 1
 *
 * WORKFLOW PROGRESSION:
 * 1. Create SO (Draft, docstatus=0)
 * 2. Submit SO (docstatus=1, status="To Deliver and Bill")
 * 3. (Optional) Create Delivery Note for items
 * 4. Mark "Ready for Invoice" (keep status, enable invoice creation)
 * 5. Create Invoice from SO
 * 6. ERPNext updates per_billed, status recalculates
 * 7. If per_billed=100: status→"To Deliver" or "Completed"
 * 8. Submit Invoice → Payment collection
 *
 * KEY: Status is NOT manually updated - it's CALCULATED by ERPNext
 * We only READ the status, never SET it except for explicit transitions
 * ============================================================================
 */

import { frappeRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"

export interface SalesOrder {
  name: string
  customer: string
  customer_name?: string
  status: string // Draft | To Deliver and Bill | To Bill | To Deliver | Completed | Cancelled | On Hold
                // "To Bill" and "To Deliver and Bill" indicate "Ready for Invoice"
  delivery_status?: string // Not Delivered | Partly Delivered | Fully Delivered | Closed | Not Applicable
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
  po_no?: string
  po_date?: string
  territory?: string
  contact_email?: string
  taxes_and_charges?: string
  terms?: string
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
        fields: '["name", "customer", "customer_name", "status", "delivery_status", "transaction_date", "delivery_date", "grand_total", "currency", "total_qty", "per_delivered", "per_billed"]',
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
        }) as { taxes?: any[] }
        
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
    const result = await frappeRequest('frappe.client.insert', 'POST', { doc: orderData })
    
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
    // 1. Fetch Quotation to verify it's submitted
    const quotation = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Quotation',
      name: quotationId
    }) as any

    if (!quotation) {
      return { error: 'Quotation not found' }
    }

    // 2. Verify quotation is submitted (docstatus = 1)
    if (quotation.docstatus !== 1) {
      return { 
        error: 'Quotation must be submitted before creating Sales Order. Please submit the quotation first.',
        needsSubmission: true
      }
    }

    // 3. Check if quotation is already ordered
    if (quotation.status === 'Ordered') {
      return { error: 'This quotation has already been converted to a Sales Order' }
    }

    // 4. Use ERPNext's built-in method to create sales order from quotation
    const result = await frappeRequest('erpnext.selling.doctype.quotation.quotation.make_sales_order', 'POST', {
      source_name: quotationId
    }) as any

    if (!result || !result.name) {
      return { error: 'Failed to create sales order' }
    }

    const salesOrderDoc = result.message || result
    
    // 5. Save the sales order
    const savedOrder = await frappeRequest('frappe.client.insert', 'POST', {
      doc: salesOrderDoc
    }) as any

    if (!savedOrder || !savedOrder.name) {
      return { error: 'Failed to save sales order' }
    }

    // 6. Update Quotation status to \"Ordered\"
    await frappeRequest('frappe.client.set_value', 'PUT', {
      doctype: 'Quotation',
      name: quotationId,
      fieldname: 'status',
      value: 'Ordered'
    })

    // 7. If there's a linked opportunity, update it to \"Converted\"
    if (quotation.opportunity) {
      await frappeRequest('frappe.client.set_value', 'PUT', {
        doctype: 'Opportunity',
        name: quotation.opportunity,
        fieldname: 'status',
        value: 'Converted'
      })
    }
    
    revalidatePath('/sales-orders')
    revalidatePath('/crm/quotations')
    revalidatePath(`/crm/quotations/${quotationId}`)
    if (quotation.opportunity) {
      revalidatePath(`/crm/opportunities/${quotation.opportunity}`)
    }
    
    return { success: true, name: savedOrder.name, salesOrder: savedOrder }
  } catch (error: any) {
    console.error("Failed to create sales order from quotation:", error)
    return { error: error.message || 'Failed to create sales order from quotation' }
  }
}

// 9. UPDATE: Update Sales Order Status
export async function updateSalesOrderStatus(orderId: string, status: string) {
  try {
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Sales Order',
      name: orderId,
      fieldname: 'status',
      value: status
    })
    
    revalidatePath('/sales-orders')
    revalidatePath(`/sales-orders/${orderId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Failed to update sales order status:", error)
    return { error: error.message || 'Failed to update sales order status' }
  }
}

// 10. READ: Get Sales Orders Ready for Invoice
export async function getSalesOrdersReadyForInvoice(): Promise<SalesOrder[]> {
  try {
    // ERPNext field availability varies across sites. Fetch a conservative list
    // (submitted, not fully billed) then filter client-side using delivery/billing fields.
    const raw = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Sales Order',
      filters: JSON.stringify([
        ['docstatus', '=', '1'],
        ['per_billed', '<', '100'],
        ['status', 'not in', ['Draft', 'Cancelled', 'On Hold', 'Closed']]
      ]),
      fields: JSON.stringify([
        'name',
        'customer',
        'customer_name',
        'transaction_date',
        'delivery_date',
        'grand_total',
        'status',
        'delivery_status',
        'billing_status',
        'per_billed',
        'per_delivered',
        'currency'
      ]),
      limit_page_length: 200,
      order_by: 'transaction_date desc'
    }) as SalesOrder[]

    if (!raw || raw.length === 0) return []

    // Filter in JS to support combinations not expressible in REST filters across ERPNext versions
    const orders = raw.filter((so: any) => {
      const perDelivered = so.per_delivered || 0
      const perBilled = so.per_billed || 0
      const deliveryStatus = so.delivery_status || 'Not Delivered'
      const billingStatus = so.billing_status || 'Not Billed'

      // Already fully billed -> exclude
      if (billingStatus === 'Fully Billed' || perBilled >= 100) return false

      // Terminal status -> exclude
      if (['Cancelled', 'On Hold', 'Closed', 'Draft'].includes(so.status)) return false

      // If delivery not applicable (services), it's ready based on billing
      if (deliveryStatus === 'Not Applicable') return true

      // If some items delivered (partly or fully) and not fully billed, include
      if (perDelivered > 0) return true

      // Otherwise not ready
      return false
    })

    return orders || []
  } catch (error: any) {
    console.error("Failed to fetch sales orders ready for invoice:", error)
    return []
  }
}

// 11. UPDATE: Mark Sales Order as Ready for Invoice
export async function markSalesOrderReadyForInvoice(orderId: string) {
  try {
    console.log('[markSalesOrderReadyForInvoice] Marking sales order as ready for invoice:', orderId)

    // Fetch current sales order to validate
    const salesOrder = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Order',
      name: orderId
    }) as any

    if (!salesOrder) {
      return { error: 'Sales Order not found' }
    }

    // Validate that the order is submitted
    if (salesOrder.docstatus !== 1) {
      return {
        error: 'Sales Order must be submitted before marking as ready for invoice',
        needsSubmission: true
      }
    }

    // Validate that it's not already fully billed
    if (salesOrder.per_billed >= 100) {
      return {
        error: 'Sales Order is already fully billed',
        alreadyFullyBilled: true
      }
    }

    // Determine appropriate status based on delivery status
    let newStatus: string
    if (salesOrder.delivery_status === 'Fully Delivered') {
      newStatus = 'To Bill'
    } else if (salesOrder.delivery_status === 'Partly Delivered' || salesOrder.delivery_status === 'Not Delivered') {
      newStatus = 'To Deliver and Bill'
    } else {
      newStatus = 'To Bill' // Default for other cases
    }

    // Update the status
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Sales Order',
      name: orderId,
      fieldname: 'status',
      value: newStatus
    })

    console.log('[markSalesOrderReadyForInvoice] Sales order marked as ready for invoice with status:', newStatus)

    revalidatePath('/sales-orders')
    revalidatePath(`/sales-orders/${orderId}`)

    return {
      success: true,
      newStatus,
      deliveryStatus: salesOrder.delivery_status,
      perBilled: salesOrder.per_billed
    }

  } catch (error: any) {
    console.error('[markSalesOrderReadyForInvoice] Error:', error)
    return { error: error.message || 'Failed to mark sales order as ready for invoice' }
  }
}

// 12. READ: Get Sales Orders Eligible for Invoice Preparation
export async function getSalesOrdersEligibleForInvoice(): Promise<SalesOrder[]> {
  try {
    const raw = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Sales Order',
      filters: JSON.stringify([
        ['docstatus', '=', '1'], // Must be submitted
        ['per_billed', '<', '100'], // Not fully billed
        ['status', 'not in', ['Draft', 'Cancelled', 'On Hold', 'Closed']]
      ]),
      fields: JSON.stringify([
        'name',
        'customer',
        'customer_name',
        'transaction_date',
        'delivery_date',
        'grand_total',
        'status',
        'delivery_status',
        'billing_status',
        'per_billed',
        'per_delivered',
        'currency'
      ]),
      limit_page_length: 200,
      order_by: 'transaction_date desc'
    }) as SalesOrder[]

    if (!raw || raw.length === 0) return []

    // Keep those that are potentially invoiceable (delivery not required or some delivery done)
    const orders = raw.filter((so: any) => {
      const deliveryStatus = so.delivery_status || 'Not Delivered'
      const perDelivered = so.per_delivered || 0
      const billingStatus = so.billing_status || 'Not Billed'

      if (billingStatus === 'Fully Billed' || (so.per_billed || 0) >= 100) return false
      if (deliveryStatus === 'Not Applicable') return true
      if (perDelivered > 0) return true
      return false
    })

    return orders || []
  } catch (error: any) {
    console.error("Failed to fetch sales orders eligible for invoice:", error)
    return []
  }
}
/**
 * PRODUCTION-GRADE SALES ORDER TO INVOICE WORKFLOW
 * 
 * ERPNext Sales Order Status Logic:
 * - Calculated field based on: per_delivered, per_billed, delivery_status
 * - "To Deliver and Bill": pending delivery AND pending billing
 * - "To Bill": pending billing only (fully delivered)
 * - "To Deliver": pending delivery only (fully billed)
 * - "Completed": fully billed AND fully delivered
 * 
 * Invoice Eligibility Criteria:
 * - docstatus = 1 (Submitted)
 * - per_billed < 100 (Not fully billed)
 * - Status NOT in [Draft, Cancelled, On Hold]
 * - If "To Deliver and Bill": Can partially bill, must have delivery notes
 * - If "To Bill": Ready to bill (already delivered)
 */

// 13. COMPREHENSIVE: Check Sales Order Invoice Eligibility
export async function checkSalesOrderInvoiceEligibility(orderId: string): Promise<{
  eligible: boolean
  reason?: string
  canPartiallyBill?: boolean
  recommendations?: string[]
  data?: {
    status: string
    delivery_status: string
    per_billed: number
    per_delivered: number
    total_items: number
    delivered_items: number
  }
}> {
  try {
    console.log('[checkSalesOrderInvoiceEligibility] Checking SO:', orderId)

    const so = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Order',
      name: orderId
    }) as any

    if (!so) {
      return { eligible: false, reason: 'Sales Order not found' }
    }

    const result = {
      status: so.status,
      delivery_status: so.delivery_status,
      billing_status: so.billing_status || 'Not Billed',
      per_billed: so.per_billed || 0,
      per_delivered: so.per_delivered || 0,
      total_items: so.items?.length || 0,
      delivered_items: so.items?.filter((item: any) => item.delivered_qty && item.delivered_qty > 0).length || 0
    }

    // 1. Must be submitted
    if (so.docstatus !== 1) {
      return {
        eligible: false,
        reason: 'Sales Order must be submitted first',
        data: result,
        recommendations: ['Click "Save" then "Submit" to submit this Sales Order']
      }
    }

    // 2. Cannot be in terminal states
    if (['Cancelled', 'On Hold', 'Closed'].includes(so.status)) {
      return {
        eligible: false,
        reason: `Cannot invoice Sales Order with status "${so.status}"`,
        data: result
      }
    }

    // 3. Cannot be fully billed already
    if ((so.billing_status && so.billing_status === 'Fully Billed') || (so.per_billed >= 100)) {
      return {
        eligible: false,
        reason: 'This Sales Order is already fully billed (100%)',
        data: result
      }
    }

    // 4. Status-specific eligibility checks
    // 4. Delivery/billing combined logic
    // If delivery is "Not Applicable" (services) we allow invoicing based on billing
    if (so.delivery_status === 'Not Applicable') {
      return {
        eligible: true,
        canPartiallyBill: result.per_billed > 0 && result.per_billed < 100,
        data: result,
        recommendations: [
          'Delivery not applicable - you may create invoices as needed',
          `${result.per_billed}% currently billed`
        ]
      }
    }

    // If nothing has been delivered yet, cannot invoice (unless delivery not required)
    if (result.per_delivered === 0 || so.delivery_status === 'Not Delivered') {
      return {
        eligible: false,
        reason: 'No items have been delivered yet. Create a Delivery Note first.',
        canPartiallyBill: false,
        data: result,
        recommendations: [
          'Create a Delivery Note for at least some items',
          'Then create a partial invoice for delivered items'
        ]
      }
    }

    // If items have been delivered (partly or fully) and not fully billed, allow invoicing
    if (result.per_delivered > 0 && result.per_billed < 100) {
      return {
        eligible: true,
        canPartiallyBill: result.per_delivered < 100,
        data: result,
        recommendations: [
          `${result.per_delivered}% items delivered - ready for invoice`,
          `${result.per_billed}% currently billed`
        ]
      }
    }

    return {
      eligible: false,
      reason: `Unknown or unsupported combination: status=${so.status}, delivery_status=${so.delivery_status}, billing_status=${so.billing_status}`,
      data: result
    }

  } catch (error: any) {
    console.error('[checkSalesOrderInvoiceEligibility] Error:', error)
    return {
      eligible: false,
      reason: error.message || 'Failed to check eligibility'
    }
  }
}

// 14. UPDATE: Recalculate and sync Sales Order status from ERPNext
export async function refreshSalesOrderStatus(orderId: string): Promise<{
  success: boolean
  newStatus?: string
  per_billed?: number
  per_delivered?: number
  error?: string
}> {
  try {
    console.log('[refreshSalesOrderStatus] Refreshing SO status:', orderId)

    // Fetch latest SO to get current per_billed and per_delivered
    const so = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Order',
      name: orderId
    }) as any

    if (!so) {
      return { success: false, error: 'Sales Order not found' }
    }

    const perBilled = so.per_billed || 0
    const perDelivered = so.per_delivered || 0
    const deliveryStatus = so.delivery_status || 'Not Delivered'

    // ERPNext automatically calculates status, but we can log it for debugging
    console.log(`[refreshSalesOrderStatus] SO: ${orderId}`, {
      status: so.status,
      per_billed: perBilled,
      per_delivered: perDelivered,
      delivery_status: deliveryStatus
    })

    // Determine expected status based on ERPNext logic
    let expectedStatus = 'To Deliver and Bill' // Default

    if (perBilled >= 100 && perDelivered >= 100) {
      expectedStatus = 'Completed'
    } else if (perBilled >= 100) {
      expectedStatus = 'To Deliver'
    } else if (perDelivered >= 100) {
      expectedStatus = 'To Bill'
    }

    return {
      success: true,
      newStatus: so.status,
      per_billed: perBilled,
      per_delivered: perDelivered
    }

  } catch (error: any) {
    console.error('[refreshSalesOrderStatus] Error:', error)
    return { success: false, error: error.message }
  }
}

// 15. CREATE: Production-grade "Create Invoice from Sales Order"
export async function createInvoiceFromReadySalesOrder(orderId: string, invoiceData?: {
  postingDate?: string
  dueDate?: string
  description?: string
}): Promise<{
  success?: boolean
  invoiceName?: string
  message?: string
  error?: string
  validation?: {
    passed: boolean
    issues: string[]
  }
}> {
  try {
    console.log('[createInvoiceFromReadySalesOrder] Creating invoice from SO:', orderId)

    // 1. Check eligibility first
    const eligibility = await checkSalesOrderInvoiceEligibility(orderId)

    if (!eligibility.eligible) {
      return {
        error: eligibility.reason,
        validation: {
          passed: false,
          issues: eligibility.recommendations || []
        }
      }
    }

    // 2. Fetch Sales Order
    const so = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Order',
      name: orderId
    }) as any

    console.log('[createInvoiceFromReadySalesOrder] SO fetched:', {
      name: so.name,
      status: so.status,
      per_billed: so.per_billed,
      per_delivered: so.per_delivered
    })

    // 3. Use ERPNext's built-in method to generate invoice
    const invoiceDraft = await frappeRequest(
      'erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice',
      'POST',
      { source_name: orderId }
    ) as any

    if (!invoiceDraft?.message) {
      throw new Error('Failed to generate invoice from Sales Order template')
    }

    let invoiceDoc = invoiceDraft.message

    // 4. Apply custom dates if provided
    if (invoiceData?.postingDate) {
      invoiceDoc.posting_date = invoiceData.postingDate
    }
    if (invoiceData?.dueDate) {
      invoiceDoc.due_date = invoiceData.dueDate
    }
    if (invoiceData?.description) {
      invoiceDoc.remarks = invoiceData.description
    }

    // Ensure draft status
    invoiceDoc.docstatus = 0

    console.log('[createInvoiceFromReadySalesOrder] Invoice doc prepared, items:', invoiceDoc.items?.length)

    // 5. Save invoice
    const savedInvoice = await frappeRequest('frappe.client.insert', 'POST', {
      doc: invoiceDoc
    }) as any

    if (!savedInvoice?.name) {
      throw new Error('Failed to save invoice')
    }

    const invoiceName = savedInvoice.name
    console.log('[createInvoiceFromReadySalesOrder] Invoice created:', invoiceName)

    // 6. Refresh SO status (ERPNext updates per_billed automatically)
    try {
      const statusRefresh = await refreshSalesOrderStatus(orderId)
      console.log('[createInvoiceFromReadySalesOrder] SO status refreshed:', statusRefresh.newStatus)
    } catch (statusError) {
      console.error('[createInvoiceFromReadySalesOrder] Warning - could not refresh status:', statusError)
      // Don't fail the whole operation
    }

    // 7. Revalidate cache
    revalidatePath('/invoices')
    revalidatePath('/sales-orders')
    revalidatePath(`/sales-orders/${orderId}`)

    return {
      success: true,
      invoiceName,
      message: `Invoice ${invoiceName} created successfully from Sales Order ${orderId}`
    }

  } catch (error: any) {
    console.error('[createInvoiceFromReadySalesOrder] Error:', error)
    return {
      error: error.message || 'Failed to create invoice from sales order'
    }
  }
}