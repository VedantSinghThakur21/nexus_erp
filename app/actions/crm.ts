'use server'

import { frappeRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"

export interface Lead {
  name: string
  lead_name: string
  email_id: string
  mobile_no: string
  status: string // Open | Contacted | Interested | Qualified | Converted | Lost
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
  const leadData = {
    doctype: 'Lead',
    // Details
    salutation: data.salutation,
    first_name: data.first_name,
    middle_name: data.middle_name,
    last_name: data.last_name,
    job_title: data.job_title,
    gender: data.gender,
    source: data.source,
    status: 'Lead', // Default status
    
    // Contact Info
    email_id: data.email_id,
    mobile_no: data.mobile_no,
    phone: data.phone,
    website: data.website,
    
    // Organization
    company_name: data.company_name, 
    no_of_employees: data.no_of_employees,
    annual_revenue: data.annual_revenue,
    industry: data.industry,
    market_segment: data.market_segment,
    territory: data.territory,
    fax: data.fax
  }

  try {
    await frappeRequest('frappe.client.insert', 'POST', {
      doc: leadData
    })
    revalidatePath('/crm')
    return { success: true }
  } catch (error: any) {
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

// 3. CONVERT: Create Opportunity from Qualified Lead
export async function convertLeadToOpportunity(leadId: string, createCustomer: boolean = false) {
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
      title: `${lead.company_name || lead.lead_name} - Sales Opportunity`,
      customer_name: lead.lead_name
    }

    const opportunity = await frappeRequest('frappe.client.insert', 'POST', { doc: opportunityData })

    // 4. Update Lead Status
    if (!customerId) {
      await frappeRequest('frappe.client.set_value', 'POST', {
        doctype: 'Lead',
        name: leadId,
        fieldname: 'status',
        value: 'Qualified'
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
    // Use ERPNext's built-in server method to create quotation from opportunity
    const quotation = await frappeRequest(
      'erpnext.crm.doctype.opportunity.opportunity.make_quotation',
      'POST',
      { source_name: opportunityId }
    )

    if (!quotation) {
      throw new Error("Failed to create quotation from opportunity")
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
    
    return quotation
  } catch (error: any) {
    console.error("Create quotation error:", error)
    throw new Error(error.message || 'Failed to create quotation from opportunity')
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

// ========== OPPORTUNITY STATUS MANAGEMENT ==========

// 1. Mark Opportunity as Won
export async function markOpportunityAsWon(opportunityId: string) {
  try {
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Opportunity',
      name: opportunityId,
      fieldname: {
        status: 'Converted',
        sales_stage: 'Won',
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

// 2. Mark Opportunity as Lost
export async function markOpportunityAsLost(opportunityId: string, lostReason: string) {
  try {
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Opportunity',
      name: opportunityId,
      fieldname: {
        status: 'Lost',
        sales_stage: 'Lost',
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
