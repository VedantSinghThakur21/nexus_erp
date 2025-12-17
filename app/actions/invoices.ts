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

// 1. READ: Fetch list of invoices
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

// 2. CREATE: Create a new Invoice (Updated for GST)
export async function createInvoice(data: any) {
  // Map frontend data to ERPNext Sales Invoice DocType
  const invoiceDoc = {
    doctype: 'Sales Invoice',
    customer: data.customer,
    posting_date: data.posting_date, // Important for tax calculation date
    due_date: data.due_date,
    
    // Map Items
    items: data.items.map((item: any) => ({
        item_code: item.item_code || 'Service',
        description: item.description,
        qty: parseFloat(item.qty),
        rate: parseFloat(item.rate),
        // Map frontend 'hsn_sac' to ERPNext field 'gst_hsn_code'
        gst_hsn_code: item.hsn_sac, 
        uom: "Nos" // Default Unit of Measure
    })),
    
    // Set default tax template if needed, or let ERPNext fetch from Customer/Master
    // taxes_and_charges: "In State GST", 
    
    docstatus: 0 // Draft mode
  }

  try {
    const newDoc = await frappeRequest('frappe.client.insert', 'POST', {
      doc: invoiceDoc
    })
    
    revalidatePath('/invoices')
    // Return the name so frontend can redirect to detail page
    return { success: true, name: newDoc.name } 
  } catch (error: any) {
    console.error("Create invoice error:", error)
    return { error: error.message || 'Failed to create invoice' }
  }
}

// 3. SUBMIT: Finalize (Draft -> Submitted)
export async function submitInvoice(id: string) {
  try {
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

// 5. SEARCH: Search for Customers
export async function searchCustomers(query: string) {
  try {
    const customers = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Customer',
        filters: `[["customer_name", "like", "%${query}%"]]`,
        fields: '["name", "customer_name"]',
        limit_page_length: 10
      }
    )
    return customers as { name: string, customer_name: string }[]
  } catch (error) {
    console.error("Failed to search customers:", error)
    return []
  }
}

// 6. SEARCH: Search for Items (Products/Services)
export async function searchItems(query: string) {
  try {
    const items = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Item',
        filters: `[["item_code", "like", "%${query}%"]]`,
        fields: '["item_code", "item_name", "description"]',
        limit_page_length: 10
      }
    )
    return items as { item_code: string, item_name: string, description: string }[]
  } catch (error) {
    console.error("Failed to search items:", error)
    return []
  }
}

// 7. GET COMPANY DETAILS
export async function getCompanyDetails() {
  try {
    const defaults = await frappeRequest('frappe.client.get_defaults', 'GET');
    const companyName = defaults.default_company;
    if (!companyName) return null;

    const company = await frappeRequest('frappe.client.get', 'GET', {
        doctype: 'Company',
        name: companyName
    });

    return {
        name: company.name,
        gstin: company.tax_id
    }
  } catch (e) {
    return null
  }
}

// 8. GET BANK DETAILS
export async function getBankDetails() {
  try {
    // 1. Get default company first
    const defaults = await frappeRequest('frappe.client.get_defaults', 'GET');
    const companyName = defaults.default_company;
    
    // 2. Fetch default bank account for this company
    const banks = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Bank Account',
        filters: `[["company", "=", "${companyName}"], ["is_default", "=", 1]]`,
        fields: '["bank", "bank_account_no", "branch_code"]',
        limit_page_length: 1
    })
    
    return banks[0] || null
  } catch (e) {
    return null
  }
}

// 9. GET CUSTOMER DETAILS (New)
export async function getCustomerDetails(customerId: string) {
  try {
    const customer = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Customer',
      name: customerId
    })

    // Try to fetch primary address if linked
    let addressDisplay = ""
    if (customer.customer_primary_address) {
        try {
            const address = await frappeRequest('frappe.client.get', 'GET', {
                doctype: 'Address',
                name: customer.customer_primary_address
            })
            // Simple format: Address Line 1, City, State
            addressDisplay = [address.address_line1, address.city, address.state].filter(Boolean).join(', ')
        } catch (addrError) {}
    }

    return {
      tax_id: customer.tax_id, // GSTIN
      primary_address: addressDisplay
    }
  } catch (e) {
    console.error("Failed to fetch customer details", e)
    return null
    }
  }
export async function deleteInvoice(id: string) {
  try {
    // Check status first - only Draft/Cancelled can be deleted
    const invoice = await frappeRequest('frappe.client.get', 'GET', {
        doctype: 'Sales Invoice', 
        name: id
    })

    if (invoice.docstatus === 1) {
        throw new Error("Cannot delete Submitted invoice. Cancel it first.")
    }

    await frappeRequest('frappe.client.delete', 'POST', {
      doctype: 'Sales Invoice',
      name: id
    })
    
    revalidatePath('/invoices')
    return { success: true }
  } catch (error: any) {
    console.error("Delete error:", error)
    return { error: error.message || 'Failed to delete invoice' }
  }
}

