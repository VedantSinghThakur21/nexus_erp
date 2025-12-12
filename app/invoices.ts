'use server'

import { frappeRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"

export interface Invoice {
  name: string
  customer_name: string
  grand_total: number
  status: string
  due_date: string
  currency: string
  docstatus?: number // 0=Draft, 1=Submitted, 2=Cancelled
}

// 1. READ: Fetch list
export async function getInvoices() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list', 
      'GET', 
      {
        doctype: 'Sales Invoice',
        fields: '["name", "customer_name", "grand_total", "status", "due_date", "currency", "docstatus"]',
        order_by: 'creation desc',
        limit_page_length: 50
      }
    )
    return response as Invoice[]
  } catch (error) {
    console.error("Failed to fetch invoices:", error)
    return []
  }
}

// 2. CREATE: Draft new invoice
export async function createInvoice(data: any) {
  const invoiceDoc = {
    doctype: 'Sales Invoice',
    customer: data.customer,
    posting_date: data.posting_date, // Crucial for accounting
    due_date: data.due_date,
    items: data.items.map((item: any) => ({
        item_code: item.item_code || 'Service',
        description: item.description,
        qty: parseFloat(item.qty),
        rate: parseFloat(item.rate)
    })),
    docstatus: 0 // Draft
  }

  try {
    await frappeRequest('frappe.client.insert', 'POST', {
      doc: invoiceDoc
    })
    
    revalidatePath('/invoices')
    return { success: true }
  } catch (error: any) {
    console.error("Create invoice error:", error)
    return { error: error.message || 'Failed to create invoice' }
  }
}

// 3. SUBMIT: Finalize (Draft -> Submitted)
export async function submitInvoice(id: string) {
  try {
    // We use the specialized 'submit' RPC call
    await frappeRequest('frappe.client.submit', 'POST', {
      doc: { doctype: 'Sales Invoice', name: id }
    })
    
    revalidatePath(`/invoices/${id}`)
    revalidatePath('/invoices')
    return { success: true }
  } catch (error: any) {
    console.error("Submit error:", error)
    return { error: error.message || 'Failed to submit invoice' }
  }
}

// 4. CANCEL: Void (Submitted -> Cancelled)
export async function cancelInvoice(id: string) {
  try {
    await frappeRequest('frappe.client.cancel', 'POST', {
      doctype: 'Sales Invoice',
      name: id
    })
    
    revalidatePath(`/invoices/${id}`)
    revalidatePath('/invoices')
    return { success: true }
  } catch (error: any) {
    console.error("Cancel error:", error)
    return { error: error.message || 'Failed to cancel invoice' }
  }
}
