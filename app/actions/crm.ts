'use server'

import { frappeRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"

export interface Lead {
  name: string
  lead_name: string
  email_id: string
  mobile_no: string
  status: string // Lead | Open | Replied | Opportunity | Quotation | Lost Quotation | Interested | Converted | Do Not Contact
  company_name: string
  job_title?: string
  territory?: string
  source?: string
  industry?: string
}

export interface Opportunity {
  name: string
  opportunity_from: string // Lead or Customer
  party_name: string // Lead/Customer ID
  opportunity_type: string // Sales, Maintenance, etc
  status: string // Open | Quotation | Converted | Lost
  sales_stage: string // Prospecting | Qualification | Proposal | Negotiation | Won | Lost
  expected_closing: string
  probability: number // 0-100%
  opportunity_amount: number
  currency: string
  customer_name?: string
  contact_person?: string
  contact_email?: string
  territory?: string
  source?: string
  with_items: number // 0 or 1
  items?: any[]
  title?: string
  notes?: string
  order_lost_reason?: string
}

export interface Quotation {
  name: string
  quotation_to: string // Customer or Lead
  party_name: string
  customer_name?: string
  status: string // Draft | Open | Ordered | Lost
  valid_till: string
  grand_total: number
  currency: string
  items: any[]
  opportunity?: string
  transaction_date?: string
}

// ========== OPPORTUNITIES ==========

// 1. READ: Get All Opportunities
export async function getOpportunities() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Opportunity',
        fields: '["name", "opportunity_from", "party_name", "customer_name", "opportunity_type", "status", "sales_stage", "expected_closing", "probability", "opportunity_amount", "currency"]',
        order_by: 'creation desc',
        limit_page_length: 100
      }
    )
    return response as Opportunity[]
  } catch (error) {
    console.error("Failed to fetch opportunities:", error)
    return []
  }
}

// 2. READ: Get Single Opportunity
export async function getOpportunity(id: string) {
  try {
    const opportunity = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Opportunity',
      name: decodeURIComponent(id)
    })
    return opportunity
  } catch (error) {
    console.error("Failed to fetch opportunity:", error)
    return null
  }
}

// 3. UPDATE: Update Opportunity Sales Stage
export async function updateOpportunitySalesStage(opportunityId: string, salesStage: string, probability: number) {
  try {
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Opportunity',
      name: opportunityId,
      fieldname: {
        sales_stage: salesStage,
        probability: probability
      }
    })
    
    revalidatePath('/crm')
    revalidatePath(`/crm/opportunities/${opportunityId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Sales stage update error:", error)
    return { error: error.message || 'Failed to update sales stage' }
  }
}

// ========== LEADS ==========

// 1. READ: Fetch list of leads
export async function getLeads() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list', 
      'GET', 
      {
        doctype: 'Lead',
        fields: '["name", "lead_name", "email_id", "mobile_no", "status", "company_name", "job_title", "territory"]',
        order_by: 'creation desc',
        limit_page_length: 50
      }
    )
    return response as Lead[]
  } catch (error) {
    console.error("Failed to fetch leads:", error)
    return []
  }
}

// 2. CREATE: Add a new lead (Expanded for Detailed View)
export async function createLead(data: any) {
  // We switched to a JSON object 'data' to handle the larger form structure easily
  const leadData: any = {
    doctype: 'Lead',
    // Details
    first_name: data.first_name,
    status: 'Lead', // Default status
    
    // Contact Info
    email_id: data.email_id,
    mobile_no: data.mobile_no,
  }

  // Add optional fields only if they have values
  if (data.salutation) leadData.salutation = data.salutation
  if (data.middle_name) leadData.middle_name = data.middle_name
  if (data.last_name) leadData.last_name = data.last_name
  if (data.job_title) leadData.job_title = data.job_title
  if (data.gender) leadData.gender = data.gender
  if (data.source) leadData.source = data.source
  if (data.phone) leadData.phone = data.phone
  if (data.website) leadData.website = data.website
  if (data.company_name) leadData.company_name = data.company_name
  if (data.no_of_employees) leadData.no_of_employees = data.no_of_employees
  if (data.annual_revenue) leadData.annual_revenue = data.annual_revenue
  if (data.industry) leadData.industry = data.industry
  if (data.market_segment) leadData.market_segment = data.market_segment
  if (data.territory) leadData.territory = data.territory
  if (data.fax) leadData.fax = data.fax

  try {
    await frappeRequest('frappe.client.insert', 'POST', {
      doc: leadData
    })
    revalidatePath('/crm')
    return { success: true }
  } catch (error: any) {
    console.error("Create lead error:", error)
    return { error: error.message || 'Failed to create lead' }
  }
}

// 3. UPDATE: Save detailed info (Used by the Edit Sheet)
export async function updateLead(leadId: string, formData: FormData) {
  const values: Record<string, any> = {}
  
  if (formData.has('source')) values.source = formData.get('source')?.toString() || ""
  if (formData.has('territory')) values.territory = formData.get('territory')?.toString() || ""
  if (formData.has('notes')) values.notes = formData.get('notes')?.toString() || ""
  if (formData.has('status')) values.status = formData.get('status')?.toString() || "Open"

  try {
    await frappeRequest('frappe.client.set_value', 'POST', {
        doctype: 'Lead',
        name: leadId,
        fieldname: values
    })

    revalidatePath(`/crm/${leadId}`)
    revalidatePath('/crm')
    return { success: true }
  } catch (error: any) {
    console.error("Update error:", error)
    return { error: error.message || 'Update failed' }
  }
}

// 4. UPDATE STATUS: For Kanban Drag-and-Drop
export async function updateLeadStatus(leadId: string, newStatus: string) {
  try {
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Lead',
      name: leadId,
      fieldname: 'status',
      value: newStatus
    })
    
    revalidatePath('/crm')
    return { success: true }
  } catch (error: any) {
    console.error("Status update error:", error)
    return { error: error.message || 'Failed to update status' }
  }
}

export interface Customer {
  name: string // ID
  customer_name: string
  customer_type: string
  territory: string
  email_id?: string
}

// 1. READ: Get All Customers
export async function getCustomers() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list', 
      'GET', 
      {
        doctype: 'Customer',
        fields: '["name", "customer_name", "customer_type", "territory"]',
        order_by: 'creation desc',
        limit_page_length: 50
      }
    )
    return response as Customer[]
  } catch (error) {
    console.error("Failed to fetch customers:", error)
    return []
  }
}

// 2. CONVERT: Create Customer from Lead
export async function convertLeadToCustomer(leadId: string) {
  try {
    // 1. Fetch Lead Details
    const lead = await frappeRequest('frappe.client.get', 'GET', {
        doctype: 'Lead', 
        name: leadId 
    })

    if (!lead) throw new Error("Lead not found")

    // 2. Create Customer Object
    const customerData = {
        doctype: 'Customer',
        customer_name: lead.company_name || lead.lead_name, // Prefer Company Name
        customer_type: lead.company_name ? 'Company' : 'Individual',
        territory: lead.territory || 'All Territories',
        email_id: lead.email_id,
        mobile_no: lead.mobile_no
    }

    // 3. Save to ERPNext
    const customer = await frappeRequest('frappe.client.insert', 'POST', { doc: customerData })
    
    // 4. Update Lead Status to 'Converted'
    await frappeRequest('frappe.client.set_value', 'POST', {
        doctype: 'Lead',
        name: leadId,
        fieldname: 'status',
        value: 'Converted'
    })

    revalidatePath('/crm')
    return { success: true, customerId: customer.name }
  } catch (error: any) {
    return { error: error.message || 'Failed to convert lead' }
  }
}

// 3. CONVERT: Create Opportunity from Lead (Interested or Replied status)
export async function convertLeadToOpportunity(leadId: string, createCustomer: boolean = false, opportunityAmount: number = 0) {
  try {
    // 1. Fetch Lead
    const lead = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Lead',
      name: leadId
    })

    if (!lead) throw new Error("Lead not found")

    let customerId = null
    
    // 2. Optionally create customer first
    if (createCustomer) {
      const customerResult = await convertLeadToCustomer(leadId)
      if (customerResult.error) throw new Error(customerResult.error)
      customerId = customerResult.customerId
    }

    // 3. Create Opportunity
    const opportunityData = {
      doctype: 'Opportunity',
      opportunity_from: customerId ? 'Customer' : 'Lead',
      party_name: customerId || leadId,
      opportunity_type: 'Sales',
      status: 'Open',
      sales_stage: 'Qualification',
      probability: 20,
      currency: 'INR',
      opportunity_amount: opportunityAmount,
      title: `${lead.company_name || lead.lead_name} - Sales Opportunity`,
      customer_name: lead.lead_name
    }

    const opportunity = await frappeRequest('frappe.client.insert', 'POST', { doc: opportunityData })

    // 4. Update Lead Status to "Opportunity" (valid ERPNext status)
    if (!customerId) {
      await frappeRequest('frappe.client.set_value', 'POST', {
        doctype: 'Lead',
        name: leadId,
        fieldname: 'status',
        value: 'Opportunity'
      })
    }

    revalidatePath('/crm')
    return { success: true, opportunityId: opportunity.name }
  } catch (error: any) {
    console.error("Convert to opportunity error:", error)
    return { error: error.message || 'Failed to create opportunity' }
  }
}

// ========== QUOTATIONS ==========

// 1. CREATE: Generate Quotation from Opportunity
export async function createQuotationFromOpportunity(opportunityId: string) {
  try {
    // Use ERPNext's built-in server method to get quotation template from opportunity
    const draftQuotation = await frappeRequest(
      'erpnext.crm.doctype.opportunity.opportunity.make_quotation',
      'POST',
      { source_name: opportunityId }
    )

    console.log('ERPNext make_quotation draft response:', JSON.stringify(draftQuotation, null, 2))

    if (!draftQuotation) {
      throw new Error("Failed to create quotation template from opportunity")
    }

    // The make_quotation method returns a draft document without a name
    // We need to insert it to get the actual quotation name
    const quotationDoc = draftQuotation.message || draftQuotation
    
    // Remove the name field if it exists (it might be empty)
    if (quotationDoc.name === undefined || quotationDoc.name === null || quotationDoc.name === '') {
      delete quotationDoc.name
    }

    // Insert the document to create the actual quotation
    const savedQuotation = await frappeRequest('frappe.client.insert', 'POST', {
      doc: quotationDoc
    })

    console.log('Saved quotation response:', JSON.stringify(savedQuotation, null, 2))

    if (!savedQuotation || !savedQuotation.name) {
      throw new Error("Failed to save quotation - no name returned")
    }

    // The server method automatically:
    // - Creates the quotation with all opportunity items
    // - Links it back to the opportunity
    // - Copies customer/lead info
    // - Sets proper currency and pricing

    revalidatePath('/crm')
    revalidatePath('/crm/opportunities')
    revalidatePath(`/crm/opportunities/${opportunityId}`)
    revalidatePath('/crm/quotations')
    
    return savedQuotation
  } catch (error: any) {
    console.error("Create quotation error:", error)
    throw new Error(error.message || 'Failed to create quotation from opportunity')
  }
}

// 1a. CREATE: Create Quotation from scratch
export async function createQuotation(quotationData: {
  quotation_to: string
  party_name: string
  transaction_date: string
  valid_till: string
  currency: string
  order_type: string
  items: any[]
  payment_terms_template?: string
  terms?: string
  taxes_and_charges?: string
}) {
  try {
    const doc: any = {
      doctype: 'Quotation',
      quotation_to: quotationData.quotation_to,
      party_name: quotationData.party_name,
      transaction_date: quotationData.transaction_date,
      valid_till: quotationData.valid_till,
      currency: quotationData.currency,
      order_type: quotationData.order_type,
      items: quotationData.items
    }

    // Add optional fields
    if (quotationData.payment_terms_template) {
      doc.payment_terms_template = quotationData.payment_terms_template
    }
    
    if (quotationData.terms) {
      doc.terms = quotationData.terms
    }

    // If tax template is specified, fetch and add tax rows
    if (quotationData.taxes_and_charges) {
      doc.taxes_and_charges = quotationData.taxes_and_charges
      
      try {
        // Fetch the tax template to get the tax rows
        const taxTemplate = await frappeRequest('frappe.client.get', 'GET', {
          doctype: 'Sales Taxes and Charges Template',
          name: quotationData.taxes_and_charges
        })
        
        // Add the tax rows to the quotation
        if (taxTemplate.taxes && taxTemplate.taxes.length > 0) {
          doc.taxes = taxTemplate.taxes.map((tax: any, idx: number) => ({
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

    // Create the quotation
    const quotation = await frappeRequest('frappe.client.insert', 'POST', {
      doc
    })

    if (!quotation || !quotation.name) {
      throw new Error("Failed to create quotation")
    }

    revalidatePath('/crm')
    revalidatePath('/crm/quotations')
    
    return quotation
  } catch (error: any) {
    console.error("Create quotation error:", error)
    throw new Error(error.message || 'Failed to create quotation')
  }
}

// 2. READ: Get All Quotations
export async function getQuotations() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Quotation',
        fields: '["name", "quotation_to", "party_name", "customer_name", "status", "valid_till", "grand_total", "currency", "transaction_date", "opportunity"]',
        order_by: 'creation desc',
        limit_page_length: 50
      }
    )
    return response as Quotation[]
  } catch (error) {
    console.error("Failed to fetch quotations:", error)
    return []
  }
}

// 3. READ: Get Single Quotation
export async function getQuotation(id: string) {
  try {
    const quotation = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Quotation',
      name: decodeURIComponent(id)
    })
    return quotation
  } catch (error) {
    console.error("Failed to fetch quotation:", error)
    return null
  }
}

// 3a. UPDATE: Update existing Quotation
export async function updateQuotation(quotationId: string, quotationData: {
  quotation_to: string
  party_name: string
  transaction_date: string
  valid_till: string
  currency: string
  order_type?: string
  items: Array<{
    item_code?: string
    item_name?: string
    description: string
    qty: number
    rate: number
    amount: number
  }>
  payment_terms_template?: string
  terms?: string
  opportunity?: string
  taxes_and_charges?: string
}) {
  try {
    // Get existing quotation to preserve fields
    const existingQuotation = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Quotation',
      name: quotationId
    })

    if (!existingQuotation) {
      throw new Error('Quotation not found')
    }

    // Prepare updated document
    const updatedQuotation = {
      ...existingQuotation,
      quotation_to: quotationData.quotation_to,
      party_name: quotationData.party_name,
      transaction_date: quotationData.transaction_date,
      valid_till: quotationData.valid_till,
      currency: quotationData.currency,
      order_type: quotationData.order_type || 'Sales',
      items: quotationData.items.map((item, idx) => ({
        idx: idx + 1,
        doctype: 'Quotation Item',
        item_code: item.item_code || undefined,
        item_name: item.item_name || item.item_code,
        description: item.description,
        qty: item.qty,
        rate: item.rate,
        amount: item.amount
      }))
    }

    // Add optional fields
    if (quotationData.payment_terms_template) {
      updatedQuotation.payment_terms_template = quotationData.payment_terms_template
    }
    
    if (quotationData.terms) {
      updatedQuotation.terms = quotationData.terms
    }
    
    if (quotationData.opportunity) {
      updatedQuotation.opportunity = quotationData.opportunity
    }

    // If tax template is specified, fetch and add tax rows
    if (quotationData.taxes_and_charges) {
      updatedQuotation.taxes_and_charges = quotationData.taxes_and_charges
      
      try {
        // Fetch the tax template to get the tax rows
        const taxTemplate = await frappeRequest('frappe.client.get', 'GET', {
          doctype: 'Sales Taxes and Charges Template',
          name: quotationData.taxes_and_charges
        })
        
        // Add the tax rows to the quotation
        if (taxTemplate.taxes && taxTemplate.taxes.length > 0) {
          updatedQuotation.taxes = taxTemplate.taxes.map((tax: any, idx: number) => ({
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
    } else {
      // Clear taxes if no template selected
      updatedQuotation.taxes = []
    }

    // Update in ERPNext using save method to recalculate totals
    const result = await frappeRequest('frappe.client.save', 'POST', {
      doc: updatedQuotation
    })

    revalidatePath('/crm/quotations')
    revalidatePath(`/crm/quotations/${quotationId}`)

    return { success: true, quotation: result }
  } catch (error: any) {
    console.error("Update quotation error:", error)
    return { error: error.message || 'Failed to update quotation' }
  }
}

// 4. UPDATE: Submit Quotation (make it official)
export async function submitQuotation(quotationId: string) {
  try {
    // Fetch latest document
    const doc = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Quotation',
      name: quotationId
    })

    // Submit with latest modified timestamp
    await frappeRequest('frappe.client.submit', 'POST', {
      doc: {
        doctype: 'Quotation',
        name: quotationId,
        docstatus: 1,
        modified: doc.modified
      }
    })

    revalidatePath('/crm')
    revalidatePath(`/crm/quotations/${quotationId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Submit quotation error:", error)
    return { error: error.message || 'Failed to submit quotation' }
  }
}

// 5. DELETE: Delete Quotation (only if Draft)
export async function deleteQuotation(quotationId: string) {
  try {
    // First check if quotation is in Draft status
    const quotation = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Quotation',
      name: quotationId
    })

    if (quotation.docstatus !== 0) {
      throw new Error('Only Draft quotations can be deleted')
    }

    // Delete the quotation from ERPNext
    await frappeRequest('frappe.client.delete', 'POST', {
      doctype: 'Quotation',
      name: quotationId
    })

    revalidatePath('/crm')
    revalidatePath('/crm/quotations')
    return { success: true }
  } catch (error: any) {
    console.error("Delete quotation error:", error)
    return { error: error.message || 'Failed to delete quotation' }
  }
}

export async function updateQuotationStatus(quotationId: string, newStatus: string) {
  try {
    // Update the quotation status in ERPNext
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Quotation',
      name: quotationId,
      fieldname: 'status',
      value: newStatus
    })

    revalidatePath('/crm')
    revalidatePath('/crm/quotations')
    return { success: true }
  } catch (error: any) {
    console.error("Update quotation status error:", error)
    return { error: error.message || 'Failed to update status' }
  }
}

// ========== COMPANY & BANK DETAILS ==========

// Get Company Details (for displaying on quotations/invoices)
export async function getCompanyDetails() {
  try {
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

// Get Bank Details (for displaying on quotations/invoices)
export async function getBankDetails() {
  try {
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

// ========== OPPORTUNITY STATUS MANAGEMENT ==========

// 1. Mark Opportunity as Won (and optionally create Customer)
export async function markOpportunityAsWon(opportunityId: string, createCustomer: boolean = true) {
  try {
    // Fetch opportunity details
    const opportunity = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Opportunity',
      name: opportunityId
    })

    if (!opportunity) throw new Error("Opportunity not found")

    // If opportunity is from a Lead and we want to create customer
    if (createCustomer && opportunity.opportunity_from === 'Lead') {
      const customerResult = await convertOpportunityToCustomer(opportunityId)
      if (customerResult.error) {
        console.warn('Customer creation failed, but continuing to mark as won:', customerResult.error)
      }
    }

    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Opportunity',
      name: opportunityId,
      fieldname: {
        status: 'Converted',
        probability: 100
      }
    })

    revalidatePath('/crm')
    revalidatePath(`/crm/opportunities/${opportunityId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Mark as won error:", error)
    return { error: error.message || 'Failed to mark as won' }
  }
}

// Convert Opportunity to Customer
export async function convertOpportunityToCustomer(opportunityId: string) {
  try {
    // 1. Fetch Opportunity Details
    const opportunity = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Opportunity',
      name: opportunityId
    })

    if (!opportunity) throw new Error("Opportunity not found")

    // 2. If it's already from a Customer, nothing to do
    if (opportunity.opportunity_from === 'Customer') {
      return { success: true, customerId: opportunity.party_name, alreadyCustomer: true }
    }

    // 3. Get Lead details if opportunity is from Lead
    let customerName = opportunity.customer_name || opportunity.party_name
    let email = null
    let mobile = null
    let territory = 'All Territories'

    if (opportunity.opportunity_from === 'Lead') {
      try {
        const lead = await frappeRequest('frappe.client.get', 'GET', {
          doctype: 'Lead',
          name: opportunity.party_name
        })
        customerName = lead.company_name || lead.lead_name
        email = lead.email_id
        mobile = lead.mobile_no
        territory = lead.territory || territory
      } catch (e) {
        console.warn('Could not fetch lead details:', e)
      }
    }

    // 4. Create Customer
    const customerData = {
      doctype: 'Customer',
      customer_name: customerName,
      customer_type: 'Company',
      territory: territory,
      email_id: email,
      mobile_no: mobile
    }

    const customer = await frappeRequest('frappe.client.insert', 'POST', { doc: customerData })

    // 5. Update Opportunity to link to Customer
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Opportunity',
      name: opportunityId,
      fieldname: {
        opportunity_from: 'Customer',
        party_name: customer.name
      }
    })

    // 6. If from Lead, update Lead status to Converted
    if (opportunity.opportunity_from === 'Lead') {
      try {
        await frappeRequest('frappe.client.set_value', 'POST', {
          doctype: 'Lead',
          name: opportunity.party_name,
          fieldname: 'status',
          value: 'Converted'
        })
      } catch (e) {
        console.warn('Could not update lead status:', e)
      }
    }

    revalidatePath('/crm')
    revalidatePath('/crm/opportunities')
    revalidatePath('/invoices/new')
    return { success: true, customerId: customer.name }
  } catch (error: any) {
    console.error("Convert opportunity to customer error:", error)
    return { error: error.message || 'Failed to convert to customer' }
  }
}

// 2. Mark Opportunity as Lost
export async function markOpportunityAsLost(opportunityId: string, lostReason: string) {
  try {
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Opportunity',
      name: opportunityId,
      fieldname: {
        status: 'Lost',
        probability: 0,
        order_lost_reason: lostReason
      }
    })

    revalidatePath('/crm')
    revalidatePath(`/crm/opportunities/${opportunityId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Mark as lost error:", error)
    return { error: error.message || 'Failed to mark as lost' }
  }
}

// Reopen Opportunity (Undo Won/Lost)
export async function reopenOpportunity(opportunityId: string) {
  try {
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Opportunity',
      name: opportunityId,
      fieldname: {
        status: 'Open',
        sales_stage: 'Qualification',
        probability: 20
      }
    })

    revalidatePath('/crm')
    revalidatePath('/crm/opportunities')
    revalidatePath(`/crm/opportunities/${opportunityId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Reopen opportunity error:", error)
    return { error: error.message || 'Failed to reopen opportunity' }
  }
}

// 3. UPDATE OPPORTUNITY DETAILS
export async function updateOpportunity(opportunityId: string, data: {
  opportunity_amount?: number
  expected_closing?: string
  probability?: number
  sales_stage?: string
}) {
  try {
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Opportunity',
      name: opportunityId,
      fieldname: data
    })

    revalidatePath('/crm')
    revalidatePath('/crm/opportunities')
    revalidatePath(`/crm/opportunities/${opportunityId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Update opportunity error:', error)
    return { error: error.message || 'Failed to update opportunity' }
  }
}
