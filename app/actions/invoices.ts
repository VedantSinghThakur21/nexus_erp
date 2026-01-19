'use server'

import { frappeRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"
import { canCreateInvoice, incrementUsage } from "./usage-limits"
import { headers } from "next/headers"

export interface Invoice {
  name: string
  customer_name: string
  grand_total: number
  status: string
  due_date: string
  currency: string
  docstatus?: number
  company: string
  total_taxes_and_charges?: number
  net_total?: number
  posting_date?: string
  place_of_supply?: string
  items?: any[]
  taxes?: any[]
}

export interface PaymentEntry {
  name: string
  docstatus?: number
  party_name: string
  payment_type: string
  mode_of_payment?: string
  posting_date: string
  party_type: string
  paid_amount?: number
  received_amount?: number
  difference_amount?: number
  reference_no?: string
  reference_date?: string
  references?: any[]
  paid_from?: string
  paid_to?: string
  paid_from_account_currency?: string
}

// CREATE/UPDATE ITEM
export async function createItem(formData: FormData) {
  try {
    const itemData: any = {
      doctype: 'Item',
      item_code: formData.get('item_code') as string,
      item_name: formData.get('item_name') as string,
      item_group: formData.get('item_group') as string,
      description: formData.get('description') as string,
      standard_rate: parseFloat(formData.get('standard_rate') as string),
      is_stock_item: formData.get('is_stock_item') === '1' ? 1 : 0,
      stock_uom: formData.get('stock_uom') as string || 'Unit',
    }

    // Add optional fields if provided
    const brand = formData.get('brand') as string
    const manufacturer = formData.get('manufacturer') as string
    const openingStock = formData.get('opening_stock') as string
    const reorderLevel = formData.get('reorder_level') as string

    if (brand) itemData.brand = brand
    if (manufacturer) itemData.manufacturer = manufacturer
    if (openingStock) itemData.opening_stock = parseFloat(openingStock)
    if (reorderLevel) itemData.reorder_level = parseFloat(reorderLevel)

    await frappeRequest('frappe.client.insert', 'POST', { doc: itemData })
    revalidatePath('/catalogue')
    return { success: true }
  } catch (error: any) {
    console.error("Failed to create item:", error)
    return { success: false, error: error.message || 'Failed to create item' }
  }
}

export async function updateItem(itemCode: string, formData: FormData) {
  try {
    const updateData: any = {
      item_name: formData.get('item_name') as string,
      item_group: formData.get('item_group') as string,
      description: formData.get('description') as string,
      standard_rate: parseFloat(formData.get('standard_rate') as string),
      is_stock_item: formData.get('is_stock_item') === '1' ? 1 : 0,
    }

    // Add optional fields if provided
    const brand = formData.get('brand') as string
    const manufacturer = formData.get('manufacturer') as string
    const reorderLevel = formData.get('reorder_level') as string

    if (brand) updateData.brand = brand
    if (manufacturer) updateData.manufacturer = manufacturer
    if (reorderLevel) updateData.reorder_level = parseFloat(reorderLevel)

    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Item',
      name: itemCode,
      fieldname: updateData
    })

    revalidatePath('/catalogue')
    return { success: true }
  } catch (error: any) {
    console.error("Failed to update item:", error)
    return { success: false, error: error.message || 'Failed to update item' }
  }
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

// 2. READ: Get single invoice
export async function getInvoice(invoiceId: string) {
  try {
    const invoice = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Invoice',
      name: invoiceId
    })
    return invoice
  } catch (error: any) {
    console.error("Failed to fetch invoice:", error)
    return null
  }
}

// --- HELPER: Create Tax Account if it doesn't exist ---
async function createTaxAccount(accountName: string, company: string) {
    try {
        // First, find the parent account (Duties and Taxes)
        const parentAccounts = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Account',
            filters: `[["account_name", "like", "%Duties and Taxes%"], ["is_group", "=", 1], ["company", "=", "${company}"]]`,
            fields: '["name"]',
            limit_page_length: 1
        });
        
        const parentAccount = parentAccounts[0]?.name || `Duties and Taxes - ${company}`;
        
        // Create the tax account
        const newAccount = await frappeRequest('frappe.client.insert', 'POST', {
            doc: {
                doctype: 'Account',
                account_name: accountName,
                company: company,
                parent_account: parentAccount,
                account_type: 'Tax',
                is_group: 0
            }
        });
        
        console.log(`✅ Created tax account: ${accountName} for ${company}`);
        return newAccount.name;
    } catch (error) {
        console.error(`Failed to create tax account ${accountName}:`, error);
        return null;
    }
}

// --- HELPER: Find or Create Tax Accounts ---
async function getTaxAccount(search: string, company: string) {
    try {
        const accounts = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Account',
            filters: `[["account_name", "like", "%${search}%"], ["is_group", "=", 0], ["company", "=", "${company}"]]`,
            limit_page_length: 1
        });
        
        if (accounts && accounts.length > 0) {
            return accounts[0]?.name;
        }
        
        // If not found, create it
        console.log(`Tax account ${search} not found for ${company}, creating...`);
        return await createTaxAccount(search, company);
    } catch (e) {
        console.error(`Error finding tax account ${search}:`, e);
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
            // Get company first
            const companies = await frappeRequest('frappe.client.get_list', 'GET', {
                doctype: 'Company',
                fields: '["name"]',
                limit_page_length: 1
            });
            const companyName = companies[0]?.name;
            if (!companyName) throw new Error('No company found');
            
            // Dynamically find valid accounts for this company
            const cgstAcc = await getTaxAccount('CGST', companyName) || await getTaxAccount('Tax', companyName) || 'CGST';
            const sgstAcc = await getTaxAccount('SGST', companyName) || await getTaxAccount('Tax', companyName) || 'SGST';
            const igstAcc = await getTaxAccount('IGST', companyName) || await getTaxAccount('Tax', companyName) || 'IGST';

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

// 2. CREATE: Create a new Invoice with Tax Template Support and Rental Data
export async function createInvoice(data: any) {
  // Check usage limits first
  const headersList = await headers()
  const subdomain = headersList.get('X-Subdomain')
  
  if (subdomain) {
    const usageCheck = await canCreateInvoice(subdomain)
    if (!usageCheck.allowed) {
      return { 
        error: usageCheck.message || 'Invoice limit reached',
        limitReached: true,
        currentUsage: usageCheck.current,
        limit: usageCheck.limit
      }
    }
  }
  
  // Process items to preserve rental data if coming from Sales Order
  const processedItems = (data.items || []).map((item: any) => {
    const baseItem: any = {
      item_code: item.item_code || 'Service',
      description: item.description,
      qty: parseFloat(item.qty),
      rate: parseFloat(item.rate),
      gst_hsn_code: item.hsn_sac,
      uom: item.uom || "Nos"
    }

    // Preserve rental data if present
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
      
      // Preserve all pricing components for invoice
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

  const invoiceDoc: any = {
    doctype: 'Sales Invoice',
    customer: data.customer,
    posting_date: data.posting_date,
    due_date: data.due_date,
    items: processedItems,
    docstatus: 0 // Draft mode
  }

  // Add optional fields if provided
  if (data.place_of_supply) {
    invoiceDoc.place_of_supply = data.place_of_supply
  }

  if (data.company) {
    invoiceDoc.company = data.company
  }

  // Link to Sales Order if provided (preserves rental context)
  if (data.sales_order) {
    invoiceDoc.sales_order = data.sales_order
  }

  // If tax template is specified, fetch and add tax rows
  if (data.taxes_and_charges) {
    invoiceDoc.taxes_and_charges = data.taxes_and_charges
    
    try {
      // Fetch the tax template to get the tax rows
      const taxTemplate = await frappeRequest('frappe.client.get', 'GET', {
        doctype: 'Sales Taxes and Charges Template',
        name: data.taxes_and_charges
      })
      
      // Add the tax rows to the invoice
      if (taxTemplate.taxes && taxTemplate.taxes.length > 0) {
        invoiceDoc.taxes = taxTemplate.taxes.map((tax: any, idx: number) => ({
          idx: idx + 1,
          doctype: 'Sales Taxes and Charges',
          charge_type: tax.charge_type,
          account_head: tax.account_head,
          description: tax.description,
          rate: tax.rate
        }))
      }
    } catch (taxError) {
      console.error("Error fetching tax template:", taxError)
      // Continue without taxes if template fetch fails
    }
  }

  try {
    const newDoc = await frappeRequest('frappe.client.insert', 'POST', {
      doc: invoiceDoc
    })
    
    // Increment usage counter
    if (subdomain) {
      await incrementUsage(subdomain, 'usage_invoices')
    }
    
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
    // First, fetch the latest version of the document to get the current modified timestamp
    const latestDoc = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Invoice',
      name: id
    })
    
    // Now submit with the latest document data (including modified timestamp)
    await frappeRequest('frappe.client.submit', 'POST', {
      doc: latestDoc
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

// UPDATE INVOICE STATUS
export async function updateInvoiceStatus(id: string, status: string) {
  try {
    // Fetch the current invoice first
    const invoice = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Invoice',
      name: id
    })

    // Update the status field
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Sales Invoice',
      name: id,
      fieldname: 'status',
      value: status
    })
    
    revalidatePath(`/invoices/${id}`)
    revalidatePath('/invoices')
    return { success: true }
  } catch (error: any) {
    console.error("Update status error:", error)
    return { error: error.message || 'Failed to update invoice status' }
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
export async function searchItems(query: string, itemGroup?: string) {
  try {
    let filters = `[["item_code", "like", "%${query}%"]]`
    
    // Add item group filter if specified
    if (itemGroup && itemGroup !== 'All') {
      filters = `[["item_code", "like", "%${query}%"], ["item_group", "=", "${itemGroup}"]]`
    }
    
    const items = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Item',
        filters: filters,
        fields: '["item_code", "item_name", "description", "item_group", "standard_rate", "is_stock_item"]',
        limit_page_length: 50,
        order_by: 'item_group asc, item_code asc'
    })
    
    // Enhance items with stock info for stock items
    const enhancedItems = await Promise.all(items.map(async (item: any) => {
      if (item.is_stock_item) {
        try {
          const stockData = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Bin',
            filters: `[["item_code", "=", "${item.item_code}"]]`,
            fields: '["actual_qty"]',
            limit_page_length: 0
          })
          const stockQty = stockData.reduce((sum: number, bin: any) => sum + (bin.actual_qty || 0), 0)
          return { ...item, stock_qty: stockQty, available: stockQty > 0 }
        } catch (e) {
          return { ...item, stock_qty: 0, available: false }
        }
      }
      return { ...item, stock_qty: null, available: true } // Services always available
    }))
    
    return enhancedItems as ({
      item_code: string
      item_name: string
      description: string
      item_group: string
      standard_rate?: number
      stock_qty: number | null
      available: boolean
    })[]
  } catch (error) {
    return []
  }
}

// Get all item groups
export async function getItemGroups() {
  try {
    const groups = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Item Group',
      filters: '[["is_group", "=", 0]]',
      fields: '["name"]',
      limit_page_length: 0,
      order_by: 'name asc'
    })
    return groups.map((g: any) => g.name) as string[]
  } catch (error) {
    return ['Heavy Equipment Rental', 'Construction Services', 'Consulting']
  }
}

// Ensure required Item Groups exist in ERPNext
export async function ensureItemGroups() {
  const requiredGroups = [
    { name: 'Heavy Equipment Rental', parent: 'All Item Groups' },
    { name: 'Construction Services', parent: 'All Item Groups' },
    { name: 'Consulting', parent: 'All Item Groups' }
  ]

  try {
    for (const group of requiredGroups) {
      try {
        // Check if exists
        await frappeRequest('frappe.client.get', 'GET', {
          doctype: 'Item Group',
          name: group.name
        })
      } catch (e) {
        // Create if doesn't exist
        await frappeRequest('frappe.client.insert', 'POST', {
          doc: {
            doctype: 'Item Group',
            item_group_name: group.name,
            parent_item_group: group.parent,
            is_group: 0
          }
        })
        console.log(`✅ Created Item Group: ${group.name}`)
      }
    }
    return { success: true }
  } catch (error) {
    console.error('Failed to ensure item groups:', error)
    return { success: false }
  }
}

// Get item with stock and pricing info
export async function getItemDetails(itemCode: string) {
  try {
    const item = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Item',
      name: itemCode
    })
    
    // Get stock balance across all warehouses
    let stockQty = 0
    try {
      const stockData = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Bin',
        filters: `[["item_code", "=", "${itemCode}"]]`,
        fields: '["actual_qty", "warehouse"]',
        limit_page_length: 0
      })
      stockQty = stockData.reduce((sum: number, bin: any) => sum + (bin.actual_qty || 0), 0)
    } catch (e) {
      // Stock tracking may not be enabled
    }
    
    // Get latest price from Item Price
    let price = item.standard_rate || 0
    try {
      const priceList = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Item Price',
        filters: `[["item_code", "=", "${itemCode}"]]`,
        fields: '["price_list_rate"]',
        order_by: 'modified desc',
        limit_page_length: 1
      })
      if (priceList.length > 0) {
        price = priceList[0].price_list_rate
      }
    } catch (e) {
      // No price list
    }
    
    return {
      ...item,
      stock_qty: stockQty,
      current_price: price,
      available: stockQty > 0 || !item.is_stock_item
    }
  } catch (error) {
    return null
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

// 12. CREATE PAYMENT ENTRY
export async function createPaymentEntry(data: {
  invoiceName: string
  paymentAmount: number
  paymentDate: string
  modeOfPayment?: string
  referenceNo?: string
  referenceDate?: string
}) {
  try {
    // Fetch the invoice to get necessary details
    const invoice = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Invoice',
      name: data.invoiceName
    })

    if (invoice.docstatus !== 1) {
      throw new Error('Invoice must be submitted before creating payment entry')
    }

    // Get company default cash/bank account
    const company = invoice.company
    const currency = invoice.currency || 'INR'

    // Try to find a default bank account for the company
    let paidToAccount = null
    try {
      const bankAccounts = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Bank Account',
        filters: `[["company", "=", "${company}"], ["is_default", "=", 1]]`,
        fields: '["account"]',
        limit_page_length: 1
      })
      paidToAccount = bankAccounts[0]?.account
    } catch (e) {
      console.log('No default bank account found, will use company default')
    }

    // If no bank account, try to find default cash account
    if (!paidToAccount) {
      try {
        const cashAccounts = await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'Account',
          filters: `[["account_type", "=", "Cash"], ["company", "=", "${company}"], ["is_group", "=", 0]]`,
          fields: '["name"]',
          limit_page_length: 1
        })
        paidToAccount = cashAccounts[0]?.name
      } catch (e) {
        throw new Error('No default payment account found for company')
      }
    }

    // Create Payment Entry
    const paymentEntry = await frappeRequest('frappe.client.insert', 'POST', {
      doc: {
        doctype: 'Payment Entry',
        payment_type: 'Receive',
        posting_date: data.paymentDate,
        party_type: 'Customer',
        party: invoice.customer,
        company: company,
        paid_amount: data.paymentAmount,
        received_amount: data.paymentAmount,
        paid_to: paidToAccount,
        paid_from: invoice.debit_to,
        paid_to_account_currency: currency,
        paid_from_account_currency: currency,
        mode_of_payment: data.modeOfPayment || 'Cash',
        reference_no: data.referenceNo || '',
        reference_date: data.referenceDate || data.paymentDate,
        references: [
          {
            reference_doctype: 'Sales Invoice',
            reference_name: data.invoiceName,
            allocated_amount: data.paymentAmount,
            outstanding_amount: invoice.outstanding_amount || invoice.grand_total
          }
        ]
      }
    })

    // Submit the payment entry
    await frappeRequest('frappe.client.submit', 'POST', {
      doc: paymentEntry
    })

    revalidatePath(`/invoices/${data.invoiceName}`)
    revalidatePath('/invoices')
    
    return { success: true, paymentEntry: paymentEntry.name }
  } catch (error: any) {
    console.error('Create payment entry error:', error)
    return { error: error.message || 'Failed to create payment entry' }
  }
}

// 13. GET ALL PAYMENT ENTRIES
export async function getPaymentEntries() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Payment Entry',
        fields: '["name", "posting_date", "party_name", "party_type", "paid_amount", "payment_type", "mode_of_payment", "reference_no", "reference_date", "docstatus"]',
        order_by: 'posting_date desc',
        limit_page_length: 100
      }
    )
    return response as any[]
  } catch (error) {
    console.error('Failed to fetch payment entries:', error)
    return []
  }
}

// 14. GET SINGLE PAYMENT ENTRY
export async function getPaymentEntry(id: string): Promise<PaymentEntry | null> {
  try {
    const payment = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Payment Entry',
      name: id
    }) as PaymentEntry
    return payment
  } catch (error) {
    console.error('Failed to fetch payment entry:', error)
    return null
  }
}
