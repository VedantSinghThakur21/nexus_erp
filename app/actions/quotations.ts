'use server'

import { frappeRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"

export interface Quotation {
  name: string
  quotation_to: string // Customer or Lead
  party_name: string
  customer_name?: string
  status: string // Draft | Sent | Open | Replied | Ordered | Lost | Cancelled
  docstatus?: number // 0 = Draft, 1 = Submitted, 2 = Cancelled
  valid_till: string
  grand_total: number
  currency: string
  items: QuotationItem[]
  transaction_date: string
  contact_email?: string
  territory?: string
  total_qty?: number
  net_total?: number
  total_taxes_and_charges?: number
}

export interface QuotationItem {
  item_code: string
  item_name?: string
  description?: string
  qty: number
  uom: string
  rate: number
  amount: number
  discount_percentage?: number
}

// ========== QUOTATIONS ==========

// 1. READ: Get All Quotations
export async function getQuotations() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Quotation',
        fields: '["name", "quotation_to", "party_name", "customer_name", "status", "valid_till", "grand_total", "currency", "transaction_date", "total_qty", "docstatus"]',
        order_by: 'creation desc',
        limit_page_length: 100
      }
    )
    return response as Quotation[]
  } catch (error) {
    console.error("Failed to fetch quotations:", error)
    return []
  }
}

// 2. READ: Get Single Quotation
export async function getQuotation(id: string) {
  try {
    const quotation = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Quotation',
      name: decodeURIComponent(id)
    })
    return quotation as Quotation
  } catch (error) {
    console.error("Failed to fetch quotation:", error)
    return null
  }
}

// 3. CREATE: Create New Quotation
export async function createQuotation(data: any) {
  try {
    const quotationData: any = {
      doctype: 'Quotation',
      quotation_to: data.quotation_to || 'Customer',
      party_name: data.party_name,
      transaction_date: data.transaction_date || new Date().toISOString().split('T')[0],
      valid_till: data.valid_till,
      currency: data.currency || 'USD',
      items: data.items || []
    }

    // Add optional fields
    if (data.customer_name) quotationData.customer_name = data.customer_name
    if (data.contact_email) quotationData.contact_email = data.contact_email
    if (data.territory) quotationData.territory = data.territory
    if (data.terms) quotationData.terms = data.terms

    const result = await frappeRequest('frappe.client.insert', 'POST', quotationData)
    
    revalidatePath('/quotations')
    return { success: true, data: result }
  } catch (error: any) {
    console.error("Failed to create quotation:", error)
    return { error: error.message || 'Failed to create quotation' }
  }
}

// 4. UPDATE: Update Quotation
export async function updateQuotation(id: string, data: any) {
  try {
    const result = await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Quotation',
      name: id,
      fieldname: data
    })
    
    revalidatePath('/quotations')
    revalidatePath(`/quotations/${id}`)
    return { success: true, data: result }
  } catch (error: any) {
    console.error("Failed to update quotation:", error)
    return { error: error.message || 'Failed to update quotation' }
  }
}

// 5. SUBMIT: Submit Quotation (Change from Draft to Sent)
export async function submitQuotation(id: string) {
  try {
    await frappeRequest('frappe.client.submit', 'POST', {
      doctype: 'Quotation',
      name: id
    })
    
    revalidatePath('/quotations')
    revalidatePath(`/quotations/${id}`)
    return { success: true }
  } catch (error: any) {
    console.error("Failed to submit quotation:", error)
    return { error: error.message || 'Failed to submit quotation' }
  }
}

// 6. CANCEL: Cancel Quotation
export async function cancelQuotation(id: string) {
  try {
    await frappeRequest('frappe.client.cancel', 'POST', {
      doctype: 'Quotation',
      name: id
    })
    
    revalidatePath('/quotations')
    revalidatePath(`/quotations/${id}`)
    return { success: true }
  } catch (error: any) {
    console.error("Failed to cancel quotation:", error)
    return { error: error.message || 'Failed to cancel quotation' }
  }
}

// 7. GET: Get Quotation Statistics
export async function getQuotationStats() {
  try {
    const quotations = await getQuotations()
    
    const stats = {
      draft: quotations.filter(q => q.status === 'Draft').length,
      sent: quotations.filter(q => ['Sent', 'Open'].includes(q.status)).length,
      accepted: quotations.filter(q => q.status === 'Ordered').length,
      totalValue: quotations.reduce((sum, q) => sum + (q.grand_total || 0), 0)
    }
    
    return stats
  } catch (error) {
    console.error("Failed to fetch quotation stats:", error)
    return { draft: 0, sent: 0, accepted: 0, totalValue: 0 }
  }
}
