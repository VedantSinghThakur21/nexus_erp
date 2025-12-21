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
  docstatus?: number 
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

// --- HELPER: Find Tax Accounts ---
async function getTaxAccount(search: string) {
    try {
        const accounts = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Account',
            filters: `[["account_name", "like", "%${search}%"], ["is_group", "=", 0]]`,
            limit_page_length: 1
        });
        return accounts[0]?.name;
    } catch (e) {
        return null;
    }
}

// --- HELPER: Ensure Tax Template Exists ---
async function ensureTaxTemplate(templateName: string) {
    if (!templateName) return null;
    try {
        await frappeRequest('frappe.client.get', 'GET', { 
            doctype: 'Sales Taxes and Charges Template', 
            name: templateName 
        });
        return templateName;
    } catch (e) {
        console.log(`Creating missing Tax Template: ${templateName}`);
        try {
            // Dynamically find valid accounts
            const cgstAcc = await getTaxAccount('CGST') || await getTaxAccount('Tax') || 'CGST';
            const sgstAcc = await getTaxAccount('SGST') || await getTaxAccount('Tax') || 'SGST';
            const igstAcc = await getTaxAccount('IGST') || await getTaxAccount('Tax') || 'IGST';

            // Define rows based on template name
            let taxes = [];
            if (templateName.includes('Out of State')) {
                 taxes.push({
                    charge_type: "On Net Total",
                    account_head: igstAcc,
                    description: "IGST",
                    rate: 18
                 });
            } else {
                 taxes.push({
                    charge_type: "On Net Total",
                    account_head: cgstAcc,
                    description: "CGST",
                    rate: 9
                 },
                 {
                    charge_type: "On Net Total",
                    account_head: sgstAcc,
                    description: "SGST",
                    rate: 9
                 });
            }

            await frappeRequest('frappe.client.insert', 'POST', {
                doc: {
                    doctype: 'Sales Taxes and Charges Template',
                    title: templateName,
                    is_default: 1,
                    taxes: taxes
                }
            });
            return templateName;
        } catch (createError) {
            console.error(`Failed to auto-create Tax Template ${templateName}.`, createError);
            return null;
        }
    }
}

// 2. CREATE: Create a new Invoice (Fixed Tax Logic)
export async function createInvoice(data: any) {
  // Calculate tax explicitly
  const subTotal = data.items.reduce((sum: number, item: any) => sum + (item.qty * item.rate), 0)
  
  // Determine tax rate based on template
  const taxRate = data.taxes_and_charges?.includes("GST") ? 18 : 0
  
  // Build tax rows explicitly (don't rely on templates)
  let taxRows = []
  
  if (taxRate > 0) {
    // Dynamically fetch valid tax accounts
    const cgstAcc = await getTaxAccount('CGST') || 'CGST'
    const sgstAcc = await getTaxAccount('SGST') || 'SGST'
    const igstAcc = await getTaxAccount('IGST') || 'IGST'
    
    if (data.taxes_and_charges?.includes('Out of State')) {
      // Interstate: IGST @ 18%
      taxRows.push({
        charge_type: "On Net Total",
        account_head: igstAcc,
        description: "IGST @ 18%",
        rate: 18,
        tax_amount: subTotal * 0.18
      })
    } else {
      // Intrastate: CGST + SGST @ 9% each
      taxRows.push(
        {
          charge_type: "On Net Total",
          account_head: cgstAcc,
          description: "CGST @ 9%",
          rate: 9,
          tax_amount: subTotal * 0.09
        },
        {
          charge_type: "On Net Total",
          account_head: sgstAcc,
          description: "SGST @ 9%",
          rate: 9,
          tax_amount: subTotal * 0.09
        }
      )
    }
  }

  const invoiceDoc: any = {
    doctype: 'Sales Invoice',
    customer: data.customer,
    posting_date: data.posting_date,
    due_date: data.due_date,
    
    items: data.items.map((item: any) => ({
        item_code: item.item_code || 'Service',
        description: item.description,
        qty: parseFloat(item.qty),
        rate: parseFloat(item.rate),
        gst_hsn_code: item.hsn_sac, 
        uom: "Nos" 
    })),
    
    // Add explicit tax rows
    taxes: taxRows,
    
    docstatus: 0 // Draft mode
  }

  try {
    const newDoc = await frappeRequest('frappe.client.insert', 'POST', {
      doc: invoiceDoc
    })
    
    revalidatePath('/invoices')
    return { success: true, name: newDoc.name } 
  } catch (error: any) {
    console.error("Create invoice error:", error)
    return { error: error.message || 'Failed to create invoice' }
  }
}

// 3. SUBMIT
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

// 4. CANCEL
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

// 5. SEARCH CUSTOMERS
export async function searchCustomers(query: string) {
  try {
    const customers = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Customer',
        filters: `[["customer_name", "like", "%${query}%"]]`,
        fields: '["name", "customer_name"]',
        limit_page_length: 10
    })
    return customers as { name: string, customer_name: string }[]
  } catch (error) {
    return []
  }
}

// 6. SEARCH ITEMS
export async function searchItems(query: string) {
  try {
    const items = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Item',
        filters: `[["item_code", "like", "%${query}%"]]`,
        fields: '["item_code", "item_name", "description"]',
        limit_page_length: 10
    })
    return items as { item_code: string, item_name: string, description: string }[]
  } catch (error) {
    return []
  }
}

// 7. GET COMPANY DETAILS
export async function getCompanyDetails() {
  try {
    // Get list of companies and use the first one as default
    const companies = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Company',
      fields: '["name", "tax_id"]',
      limit_page_length: 1
    });
    
    if (!companies || companies.length === 0) return null;
    
    const company = companies[0];
    return { name: company.name, gstin: company.tax_id }
  } catch (e) {
    console.error('Failed to fetch company details:', e);
    return null
  }
}

// 8. GET BANK DETAILS
export async function getBankDetails() {
  try {
    // Get first company
    const companies = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Company',
      fields: '["name"]',
      limit_page_length: 1
    });
    
    if (!companies || companies.length === 0) return null;
    const companyName = companies[0].name;
    
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

// 9. GET CUSTOMER DETAILS
export async function getCustomerDetails(customerId: string) {
  try {
    const customer = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Customer',
      name: customerId
    })

    let addressDisplay = ""
    if (customer.customer_primary_address) {
        try {
            const address = await frappeRequest('frappe.client.get', 'GET', {
                doctype: 'Address',
                name: customer.customer_primary_address
            })
            addressDisplay = [address.address_line1, address.city, address.state].filter(Boolean).join(', ')
        } catch (addrError) {}
    }

    return { tax_id: customer.tax_id, primary_address: addressDisplay }
  } catch (e) {
    return null
  }
}

// 10. DELETE INVOICE
export async function deleteInvoice(id: string) {
  try {
    const invoice = await frappeRequest('frappe.client.get', 'GET', { doctype: 'Sales Invoice', name: id })
    if (invoice.docstatus === 1) throw new Error("Cannot delete Submitted invoice")

    await frappeRequest('frappe.client.delete', 'POST', { doctype: 'Sales Invoice', name: id })
    
    revalidatePath('/invoices')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to delete invoice' }
  }
}

// 11. GET TAX TEMPLATES (New Helper)
export async function getTaxTemplates() {
  try {
    const templates = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Sales Taxes and Charges Template',
        fields: '["name", "title"]',
        filters: '[["disabled", "=", 0]]'
    })
    return templates as { name: string, title: string }[]
  } catch (error) {
    return []
  }
}
