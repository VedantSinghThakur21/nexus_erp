'use server'

import { frappeRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"
import { canCreateLead, incrementUsage } from "./usage-limits"
import { headers } from "next/headers"
import { cookies } from "next/headers"

// 7. DELETE: Delete Lead (only if not Converted)
export async function deleteLead(leadId: string) {
  try {
    // Only allow delete if not Converted
    const lead = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Lead',
      name: leadId
    }) as { status: string }

    if (lead.status === 'Converted') {
      throw new Error('Converted leads cannot be deleted')
    }

    await frappeRequest('frappe.client.delete', 'POST', {
      doctype: 'Lead',
      name: leadId
    })

    revalidatePath('/crm')
    revalidatePath('/crm/leads')
    return { success: true }
  } catch (error: any) {
    console.error('Delete lead error:', error)
    return { error: error.message || 'Failed to delete lead' }
  }
}

// 8. DELETE: Delete Opportunity (only if Open)
export async function deleteOpportunity(opportunityId: string) {
  try {
    // Only allow delete if status is Open
    const opp = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Opportunity',
      name: opportunityId
    }) as { status: string }

    if (opp.status !== 'Open') {
      throw new Error('Only Open opportunities can be deleted')
    }

    await frappeRequest('frappe.client.delete', 'POST', {
      doctype: 'Opportunity',
      name: opportunityId
    })

    revalidatePath('/crm')
    revalidatePath('/crm/opportunities')
    return { success: true }
  } catch (error: any) {
    console.error('Delete opportunity error:', error)
    return { error: error.message || 'Failed to delete opportunity' }
  }
}

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
  docstatus?: number // 0 = Draft, 1 = Submitted, 2 = Cancelled
  valid_till: string
  grand_total: number
  net_total?: number
  total_taxes_and_charges?: number
  currency: string
  items: any[]
  opportunity?: string
  transaction_date?: string
  terms?: string
}

// ========== OPPORTUNITIES ==========

// Helper: Get tenant site name from request context
async function getTenantSiteName(): Promise<string> {
  try {
    const headersList = await headers()
    const cookieStore = await cookies()
    
    // First check cookies
    const cookieTenant = cookieStore.get('tenant_subdomain')?.value
    if (cookieTenant) {
      console.log(`[DEBUG] Tenant from cookie: ${cookieTenant}`)
      return `${cookieTenant}.localhost`
    }
    
    // Then check X-Subdomain header (set by middleware)
    const headerSubdomain = headersList.get('X-Subdomain')
    if (headerSubdomain) {
      console.log(`[DEBUG] Tenant from header: ${headerSubdomain}`)
      return `${headerSubdomain}.localhost`
    }
    
    // Check x-tenant-id header
    const tenantHeader = headersList.get('x-tenant-id')
    if (tenantHeader) {
      console.log(`[DEBUG] Tenant from x-tenant-id: ${tenantHeader}`)
      return `${tenantHeader}.localhost`
    }
    
    console.log(`[DEBUG] No tenant context found, using master site`)
    return 'erp.localhost'
  } catch (error) {
    console.error('[DEBUG] Error getting tenant site name:', error)
    return 'erp.localhost'
  }
}

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
export async function getOpportunity(id: string): Promise<Opportunity | null> {
  try {
    const opportunity = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Opportunity',
      name: decodeURIComponent(id)
    })
    return opportunity as Opportunity
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
  // Check usage limits first
  const headersList = await headers()
  const subdomain = headersList.get('X-Subdomain')
  
  if (subdomain) {
    const usageCheck = await canCreateLead(subdomain)
    if (!usageCheck.allowed) {
      return { 
        error: usageCheck.message || 'Lead limit reached',
        limitReached: true,
        currentUsage: usageCheck.current,
        limit: usageCheck.limit
      }
    }
  }
  
  // Build the lead document with required fields
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

  // Add organization_slug if provided (for multi-tenancy)
  if (data.organization_slug) {
    leadData.organization_slug = data.organization_slug
  }

  try {
    await frappeRequest('frappe.client.insert', 'POST', {
      doc: leadData
    })
    
    // Increment usage counter
    if (subdomain) {
      await incrementUsage(subdomain, 'usage_leads')
    }
    
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
  // Basic Info
  if (formData.has('lead_name')) values.lead_name = formData.get('lead_name')?.toString() || ""
  if (formData.has('company_name')) values.company_name = formData.get('company_name')?.toString() || ""
  if (formData.has('job_title')) values.job_title = formData.get('job_title')?.toString() || ""
  if (formData.has('industry')) values.industry = formData.get('industry')?.toString() || ""
  // Contact Info
  if (formData.has('email_id')) values.email_id = formData.get('email_id')?.toString() || ""
  if (formData.has('mobile_no')) values.mobile_no = formData.get('mobile_no')?.toString() || ""
  // Status & Source
  if (formData.has('status')) values.status = formData.get('status')?.toString() || "Open"
  if (formData.has('source')) values.source = formData.get('source')?.toString() || ""
  // Territory & Location
  if (formData.has('territory')) values.territory = formData.get('territory')?.toString() || ""
  if (formData.has('city')) values.city = formData.get('city')?.toString() || ""
  if (formData.has('country')) values.country = formData.get('country')?.toString() || ""
  // Notes
  if (formData.has('notes')) values.notes = formData.get('notes')?.toString() || ""

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
// Update Lead status (robust, deduplicated)
export async function updateLeadStatus(leadId: string, newStatus: string) {
  try {
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Lead',
      name: leadId,
      fieldname: 'status',
      value: newStatus
    });
    revalidatePath('/crm');
    return { success: true };
  } catch (error: any) {
    console.error("Status update error:", error);
    return { error: error.message || 'Failed to update status' };
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
    }) as Lead & { organization_slug?: string }

    if (!lead) throw new Error("Lead not found")

    // 2. Create Customer Object
    const customerData: any = {
        doctype: 'Customer',
        customer_name: lead.company_name || lead.lead_name, // Prefer Company Name
        customer_type: lead.company_name ? 'Company' : 'Individual',
        territory: lead.territory || 'All Territories',
        email_id: lead.email_id,
        mobile_no: lead.mobile_no
    }

    // 3. Add organization_slug from the source lead for multi-tenancy
    if (lead.organization_slug) {
      customerData.organization_slug = lead.organization_slug
    }

    // 4. Save to ERPNext
    const customer = await frappeRequest('frappe.client.insert', 'POST', { doc: customerData }) as { name: string }
    
    // 5. Update Lead Status to 'Converted'
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

// 3. CONVERT: Create Opportunity from Lead using native ERPNext method
export async function convertLeadToOpportunity(leadId: string, createCustomer: boolean = false, opportunityAmount: number = 0) {
  try {
    console.log('[convertLeadToOpportunity] Starting conversion for lead:', leadId)
    
    // 1. Fetch Lead details (needed for organization_slug)
    const lead = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Lead',
      name: leadId
    }) as Lead & { organization_slug?: string }

    if (!lead) {
      throw new Error("Lead not found")
    }
    console.log('[convertLeadToOpportunity] Lead fetched:', lead.name, lead.lead_name)

    // 2. Optionally create customer first if conversion source should be Customer
    if (createCustomer) {
      console.log('[convertLeadToOpportunity] Creating customer from lead...')
      const customerResult = await convertLeadToCustomer(leadId)
      if (customerResult.error) {
        throw new Error(`Customer creation failed: ${customerResult.error}`)
      }
      console.log('[convertLeadToOpportunity] Customer created:', customerResult.customerId)
    }

    // 3. Always construct Opportunity doc from Lead data (no make_opportunity call)
    let opportunityDoc: any = {
      doctype: 'Opportunity',
      opportunity_from: createCustomer ? 'Customer' : 'Lead',
      party_name: createCustomer && lead.company_name ? lead.company_name : leadId,
      title: lead.company_name || lead.lead_name || `Opportunity from ${leadId}`,
      customer_name: lead.company_name || undefined,
      contact_person: lead.lead_name || undefined,
      contact_email: lead.email_id || undefined,
      territory: lead.territory || undefined,
      source: lead.source || undefined,
      opportunity_amount: opportunityAmount || 0,
      with_items: 0,
      status: 'Open',
      sales_stage: 'Qualification',
      probability: 10,
      expected_closing: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: ''
    };
    
    // Remove the name field if it exists (it might be empty)
    if (opportunityDoc.name === undefined || opportunityDoc.name === null || opportunityDoc.name === '') {
      delete opportunityDoc.name
    }

    // 5. Add organization_slug from the source lead for multi-tenancy
    if (lead.organization_slug) {
      opportunityDoc.organization_slug = lead.organization_slug
      console.log('[convertLeadToOpportunity] Set organization_slug:', lead.organization_slug)
    }

    // 6. If customer was created, update the opportunity_from to Customer
    if (createCustomer) {
      opportunityDoc.opportunity_from = 'Customer'
      // party_name should already be set to customer by make_opportunity if customer exists
      console.log('[convertLeadToOpportunity] Updated to Customer source opportunity')
    }

    // 7. Save the Opportunity
    const savedOpportunity = await frappeRequest('frappe.client.insert', 'POST', {
      doc: opportunityDoc
    }) as { name?: string }

    console.log('[convertLeadToOpportunity] Saved opportunity response:', JSON.stringify(savedOpportunity, null, 2))

    if (!savedOpportunity || !savedOpportunity.name) {
      throw new Error("Failed to save opportunity - no name returned")
    }

    const opportunityId = savedOpportunity.name
    console.log('[convertLeadToOpportunity] Opportunity created successfully:', opportunityId)

    // 8. Update Lead status to "Converted"
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Lead',
      name: leadId,
      fieldname: 'status',
      value: 'Converted'
    })
    console.log('[convertLeadToOpportunity] Lead status updated to "Converted"')

    // 9. Revalidate paths to refresh UI
    revalidatePath('/crm')
    revalidatePath('/crm/leads')
    revalidatePath(`/crm/leads/${leadId}`)
    revalidatePath('/crm/opportunities')
    revalidatePath(`/crm/opportunities/${opportunityId}`)

    console.log('[convertLeadToOpportunity] Conversion completed successfully')
    return { success: true, opportunityId }

  } catch (error: any) {
    console.error('[convertLeadToOpportunity] Error during conversion:', {
      message: error.message,
      stack: error.stack,
      fullError: error
    })
    return { 
      error: error.message || 'Failed to convert lead to opportunity'
    }
  }
}

// ========== QUOTATIONS ==========

// 1. CREATE: Generate Quotation from Opportunity
export async function createQuotationFromOpportunity(opportunityId: string) {
  try {
    console.log('[createQuotationFromOpportunity] Starting quotation creation from opportunity:', opportunityId)
    
    // 1. Fetch Opportunity to get organization_slug for multi-tenancy
    const opportunity = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Opportunity',
      name: opportunityId
    }) as any

    if (!opportunity) {
      throw new Error("Opportunity not found")
    }
    console.log('[createQuotationFromOpportunity] Opportunity fetched, organization_slug:', opportunity.organization_slug)

    // 2. Use ERPNext's built-in server method to get quotation template from opportunity
    const draftQuotation = await frappeRequest(
      'erpnext.crm.doctype.opportunity.opportunity.make_quotation',
      'POST',
      { source_name: opportunityId }
    ) as { message?: any } | any

    console.log('[createQuotationFromOpportunity] make_quotation draft response:', JSON.stringify(draftQuotation, null, 2))

    if (!draftQuotation) {
      throw new Error("Failed to create quotation template from opportunity")
    }

    // 3. Extract the quotation document
    const quotationDoc = draftQuotation.message || draftQuotation
    
    // Remove the name field if it exists (it might be empty)
    if (quotationDoc.name === undefined || quotationDoc.name === null || quotationDoc.name === '') {
      delete quotationDoc.name
    }

    // 4. Add organization_slug from the source opportunity for multi-tenancy
    if (opportunity.organization_slug) {
      quotationDoc.organization_slug = opportunity.organization_slug
      console.log('[createQuotationFromOpportunity] Set organization_slug:', opportunity.organization_slug)
    }

    // 5. Insert the document to create the actual quotation
    const savedQuotation = await frappeRequest('frappe.client.insert', 'POST', {
      doc: quotationDoc
    }) as { name?: string }

    console.log('[createQuotationFromOpportunity] Saved quotation response:', JSON.stringify(savedQuotation, null, 2))

    if (!savedQuotation || !savedQuotation.name) {
      throw new Error("Failed to save quotation - no name returned")
    }

    const quotationId = savedQuotation.name
    console.log('[createQuotationFromOpportunity] Quotation created successfully:', quotationId)


    // (Removed: Do NOT update Opportunity status to "Converted" here. Only explicit user action should mark as won.)

    // 7. Revalidate paths to refresh UI
    revalidatePath('/crm')
    revalidatePath('/crm/opportunities')
    revalidatePath(`/crm/opportunities/${opportunityId}`)
    revalidatePath('/crm/quotations')
    revalidatePath(`/crm/quotations/${quotationId}`)

    console.log('[createQuotationFromOpportunity] Quotation creation completed successfully')
    return savedQuotation
  } catch (error: any) {
    console.error('[createQuotationFromOpportunity] Error:', {
      message: error.message,
      stack: error.stack,
      fullError: error
    })
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
    // Map frontend rental fields to ERPNext custom fields
    const mappedItems = quotationData.items.map((item: any) => {
      const mappedItem: any = {
        item_code: item.item_code,
        item_name: item.item_name || item.item_code,
        description: item.description,
        qty: item.qty,
        uom: item.uom || 'Nos',
        rate: item.rate,
        amount: item.amount
      }

      // Add discount if present
      if (item.discount_percentage) {
        mappedItem.discount_percentage = item.discount_percentage
      }

      // Map rental fields to custom fields if this is a rental item
      if (item.is_rental || item.rental_type || item.rental_duration) {
        mappedItem.custom_is_rental = 1
        
        // Capitalize rental_type for ERPNext Select field (days -> Days, hours -> Hours, months -> Months)
        if (item.rental_type) {
          mappedItem.custom_rental_type = item.rental_type.charAt(0).toUpperCase() + item.rental_type.slice(1)
        }
        if (item.rental_duration) mappedItem.custom_rental_duration = item.rental_duration
        if (item.rental_start_date) mappedItem.custom_rental_start_date = item.rental_start_date
        if (item.rental_end_date) mappedItem.custom_rental_end_date = item.rental_end_date
        if (item.rental_start_time) mappedItem.custom_rental_start_time = item.rental_start_time
        if (item.rental_end_time) mappedItem.custom_rental_end_time = item.rental_end_time
        
        if (item.requires_operator) mappedItem.custom_requires_operator = 1
        if (item.operator_included) mappedItem.custom_operator_included = 1
        if (item.operator_name) mappedItem.custom_operator_name = item.operator_name
        
        // Map pricing components
        if (item.pricing_components) {
          mappedItem.custom_base_rental_cost = item.pricing_components.base_cost || 0
          mappedItem.custom_accommodation_charges = item.pricing_components.accommodation_charges || 0
          mappedItem.custom_usage_charges = item.pricing_components.usage_charges || 0
          mappedItem.custom_fuel_charges = item.pricing_components.fuel_charges || 0
          mappedItem.custom_elongation_charges = item.pricing_components.elongation_charges || 0
          mappedItem.custom_risk_charges = item.pricing_components.risk_charges || 0
          mappedItem.custom_commercial_charges = item.pricing_components.commercial_charges || 0
          mappedItem.custom_incidental_charges = item.pricing_components.incidental_charges || 0
          mappedItem.custom_other_charges = item.pricing_components.other_charges || 0
        }
        
        if (item.total_rental_cost) mappedItem.custom_total_rental_cost = item.total_rental_cost
      }

      return mappedItem
    })

    const doc: any = {
      doctype: 'Quotation',
      quotation_to: quotationData.quotation_to,
      party_name: quotationData.party_name,
      transaction_date: quotationData.transaction_date,
      valid_till: quotationData.valid_till,
      currency: quotationData.currency,
      order_type: quotationData.order_type,
      items: mappedItems
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
        }) as { taxes?: any[] }
        
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
    }) as { name?: string }

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
        fields: '["name", "quotation_to", "party_name", "customer_name", "status", "docstatus", "valid_till", "grand_total", "currency", "transaction_date", "opportunity"]',
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
export async function getQuotation(id: string): Promise<Quotation | null> {
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
    const updatedQuotation: any = {
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
        }) as { taxes?: any[] }
        
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
    // Get the current document with all fields
    const doc = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Quotation',
      name: quotationId
    }) as any

    if (doc.docstatus !== 0) {
      throw new Error('Only Draft quotations can be submitted')
    }

    // Use frappe.client.submit to properly submit the document
    await frappeRequest('frappe.client.submit', 'POST', {
      doc: doc
    })

    revalidatePath('/crm')
    revalidatePath('/crm/quotations')
    revalidatePath('/quotations')
    revalidatePath('/sales-orders')
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
    }) as { docstatus: number }

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

// 6. CANCEL: Cancel Quotation (only if Submitted)
export async function cancelQuotation(quotationId: string) {
  try {
    // Get the document
    const doc = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Quotation',
      name: quotationId
    }) as any

    if (doc.docstatus !== 1) {
      throw new Error('Only Submitted quotations can be cancelled')
    }

    // Cancel using Frappe's cancel method
    await frappeRequest('frappe.client.cancel', 'POST', {
      doctype: 'Quotation',
      name: quotationId
    })

    revalidatePath('/crm')
    revalidatePath('/crm/quotations')
    revalidatePath(`/crm/quotations/${quotationId}`)
    return { success: true }
  } catch (error: any) {
    console.error("Cancel quotation error:", error)
    return { error: error.message || 'Failed to cancel quotation' }
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
    }) as any[];
    
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
    }) as any[];
    
    if (!companies || companies.length === 0) return null;
    const companyName = companies[0].name;
    
    const banks = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Bank Account',
        filters: `[["company", "=", "${companyName}"], ["is_default", "=", 1]]`,
        fields: '["bank", "bank_account_no", "branch_code"]',
        limit_page_length: 1
    }) as any[]
    
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
    }) as Opportunity

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
    }) as Opportunity & { organization_slug?: string }

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
        }) as Lead
        customerName = lead.company_name || lead.lead_name
        email = lead.email_id
        mobile = lead.mobile_no
        territory = lead.territory || territory
      } catch (e) {
        console.warn('Could not fetch lead details:', e)
      }
    }

    // 4. Create Customer
    const customerData: any = {
      doctype: 'Customer',
      customer_name: customerName,
      customer_type: 'Company',
      territory: territory,
      email_id: email,
      mobile_no: mobile
    }

    // Add organization_slug from the source opportunity for multi-tenancy
    if (opportunity.organization_slug) {
      customerData.organization_slug = opportunity.organization_slug
    }

    const customer = await frappeRequest('frappe.client.insert', 'POST', { doc: customerData }) as { name: string }

    // 5. Update Opportunity to link to Customer
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Opportunity',
      name: opportunityId,
      fieldname: {
        opportunity_from: 'Customer',
        party_name: customer.name
      }
    })

    // 6. If from Lead, update Lead status to Converted (refetch to get updated data)
    const updatedOpportunity = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Opportunity',
      name: opportunityId
    }) as Opportunity
    
    if (updatedOpportunity.opportunity_from === 'Lead') {
      try {
        await frappeRequest('frappe.client.set_value', 'POST', {
          doctype: 'Lead',
          name: updatedOpportunity.party_name,
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

// ========== SALES ORDERS ==========

// 1. CREATE: Generate Sales Order from Quotation (Quotation -> Sales Order workflow)
export async function createOrderFromQuotation(quotationId: string) {
  try {
    console.log('[createOrderFromQuotation] Starting sales order creation from quotation:', quotationId)
    
    // 1. Fetch the Quotation to verify it's submitted and get organization_slug
    const quotation = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Quotation',
      name: quotationId
    }) as any

    if (!quotation) {
      throw new Error("Quotation not found")
    }

    console.log('[createOrderFromQuotation] Quotation fetched - docstatus:', quotation.docstatus, 'status:', quotation.status, 'organization_slug:', quotation.organization_slug)

    // 2. Require quotation to be submitted (docstatus = 1)
    if (quotation.docstatus !== 1) {
      throw new Error('Quotation must be submitted before creating a Sales Order. Please submit the quotation first.')
    }

    // 3. Check if already converted
    if (quotation.status === 'Ordered') {
      throw new Error('This quotation has already been converted to a Sales Order')
    }

    // 4. Use ERPNext's make_sales_order server method
    const draftOrder = await frappeRequest(
      'erpnext.selling.doctype.quotation.quotation.make_sales_order',
      'POST',
      { source_name: quotationId }
    ) as { message?: any } | any

    console.log('[createOrderFromQuotation] make_sales_order draft response:', JSON.stringify(draftOrder, null, 2))

    if (!draftOrder) {
      throw new Error("Failed to create sales order template from quotation")
    }

    // 5. Extract the sales order document
    const orderDoc = draftOrder.message || draftOrder
    
    if (orderDoc.name === undefined || orderDoc.name === null || orderDoc.name === '') {
      delete orderDoc.name
    }

    // 6. Add organization_slug from the source quotation for multi-tenancy
    if (quotation.organization_slug) {
      orderDoc.organization_slug = quotation.organization_slug
      console.log('[createOrderFromQuotation] Set organization_slug:', quotation.organization_slug)
    }

    // 7. Save the Sales Order
    const savedOrder = await frappeRequest('frappe.client.insert', 'POST', {
      doc: orderDoc
    }) as { name?: string }

    console.log('[createOrderFromQuotation] Saved order response:', JSON.stringify(savedOrder, null, 2))

    if (!savedOrder || !savedOrder.name) {
      throw new Error("Failed to save sales order - no name returned")
    }

    const orderId = savedOrder.name
    console.log('[createOrderFromQuotation] Sales order created successfully:', orderId)

    // 8. Submit the Sales Order (docstatus=1) so it can be invoiced
    const submittedOrder = await frappeRequest('frappe.client.submit', 'POST', {
      doctype: 'Sales Order',
      name: orderId
    })
    console.log('[createOrderFromQuotation] Sales order submitted:', JSON.stringify(submittedOrder, null, 2))

    // 9. Revalidate paths
    revalidatePath('/crm')
    revalidatePath('/crm/quotations')
    revalidatePath(`/crm/quotations/${quotationId}`)
    revalidatePath('/sales-orders')
    revalidatePath(`/sales-orders/${orderId}`)

    console.log('[createOrderFromQuotation] Sales order creation and submission completed successfully')
    return { success: true, orderId }
  } catch (error: any) {
    console.error('[createOrderFromQuotation] Error:', {
      message: error.message,
      stack: error.stack,
      fullError: error
    })
    return { error: error.message || 'Failed to create sales order' }
  }
}

// 2. READ: Get All Sales Orders
export async function getSalesOrders() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Sales Order',
        fields: '["name", "customer", "customer_name", "status", "docstatus", "transaction_date", "delivery_date", "grand_total", "currency", "quotation_no"]',
        order_by: 'creation desc',
        limit_page_length: 50
      }
    )
    return response as any[]
  } catch (error) {
    console.error("Failed to fetch sales orders:", error)
    return []
  }
}

// 3. READ: Get Single Sales Order
export async function getSalesOrder(id: string): Promise<any | null> {
  try {
    const order = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Order',
      name: decodeURIComponent(id)
    })
    return order
  } catch (error) {
    console.error("Failed to fetch sales order:", error)
    return null
  }
}

// ========== SALES INVOICES ==========

// 1. CREATE: Generate Sales Invoice from Sales Order (Sales Order -> Sales Invoice workflow)
export async function createInvoiceFromOrder(orderId: string) {
  try {
    console.log('[createInvoiceFromOrder] Starting invoice creation from sales order:', orderId)
    
    // 1. Fetch the Sales Order to verify it exists and get organization_slug
    const order = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Order',
      name: orderId
    }) as any

    if (!order) {
      throw new Error("Sales Order not found")
    }

    console.log('[createInvoiceFromOrder] Sales order fetched - docstatus:', order.docstatus, 'status:', order.status, 'organization_slug:', order.organization_slug)

    // Only allow invoicing if SO is submitted and status is correct
    if (order.docstatus !== 1) {
      throw new Error('Sales Order must be submitted before creating a Sales Invoice. Please submit the Sales Order first.')
    }
    if (order.status !== 'To Bill' && order.status !== 'To Deliver and Bill' && order.status !== 'To Deliver') {
      throw new Error(`Sales Order status must be 'To Bill', 'To Deliver and Bill', or 'To Deliver' to create an invoice. Current status: ${order.status}`)
    }

    // 2. Use ERPNext's make_sales_invoice server method
    const draftInvoice = await frappeRequest(
      'erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice',
      'POST',
      { source_name: orderId }
    ) as { message?: any } | any

    console.log('[createInvoiceFromOrder] make_sales_invoice draft response:', JSON.stringify(draftInvoice, null, 2))

    if (!draftInvoice) {
      throw new Error("Failed to create sales invoice template from sales order")
    }

    // 3. Extract the sales invoice document
    const invoiceDoc = draftInvoice.message || draftInvoice
    
    if (invoiceDoc.name === undefined || invoiceDoc.name === null || invoiceDoc.name === '') {
      delete invoiceDoc.name
    }

    // 4. Add organization_slug from the source sales order for multi-tenancy
    if (order.organization_slug) {
      invoiceDoc.organization_slug = order.organization_slug
      console.log('[createInvoiceFromOrder] Set organization_slug:', order.organization_slug)
    }

    // 5. Save the Sales Invoice
    const savedInvoice = await frappeRequest('frappe.client.insert', 'POST', {
      doc: invoiceDoc
    }) as { name?: string }

    console.log('[createInvoiceFromOrder] Saved invoice response:', JSON.stringify(savedInvoice, null, 2))

    if (!savedInvoice || !savedInvoice.name) {
      throw new Error("Failed to save sales invoice - no name returned")
    }

    const invoiceId = savedInvoice.name
    console.log('[createInvoiceFromOrder] Sales invoice created successfully:', invoiceId)

    // 6. Revalidate paths
    revalidatePath('/crm')
    revalidatePath('/sales-orders')
    revalidatePath(`/sales-orders/${orderId}`)
    revalidatePath('/invoices')
    revalidatePath(`/invoices/${invoiceId}`)

    console.log('[createInvoiceFromOrder] Sales invoice creation completed successfully')
    return { success: true, invoiceId }
  } catch (error: any) {
    console.error('[createInvoiceFromOrder] Error:', {
      message: error.message,
      stack: error.stack,
      fullError: error
    })
    return { error: error.message || 'Failed to create sales invoice' }
  }
}

// 2. READ: Get All Sales Invoices
export async function getSalesInvoices() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Sales Invoice',
        fields: '["name", "customer", "customer_name", "status", "docstatus", "posting_date", "due_date", "grand_total", "currency", "sales_order"]',
        order_by: 'creation desc',
        limit_page_length: 50
      }
    )
    return response as any[]
  } catch (error) {
    console.error("Failed to fetch sales invoices:", error)
    return []
  }
}

// 3. READ: Get Single Sales Invoice
export async function getSalesInvoice(id: string): Promise<any | null> {
  try {
    const invoice = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Invoice',
      name: decodeURIComponent(id)
    })
    return invoice
  } catch (error) {
    console.error("Failed to fetch sales invoice:", error)
    return null
  }
}

// ========== FLEET & RENTAL OPERATIONS ==========

// 1. MOBILIZE: Create Delivery Note from Sales Order and link Serial Number
export async function mobilizeAsset(orderId: string, serialNo: string) {
  try {
    console.log('[mobilizeAsset] Starting asset mobilization - Order:', orderId, 'Serial:', serialNo)
    
    // 1. Fetch the Sales Order
    const order = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Order',
      name: orderId
    }) as any

    if (!order) {
      throw new Error("Sales Order not found")
    }

    console.log('[mobilizeAsset] Sales order fetched')

    // 2. Use ERPNext's make_delivery_note server method
    const draftDeliveryNote = await frappeRequest(
      'erpnext.selling.doctype.sales_order.sales_order.make_delivery_note',
      'POST',
      { source_name: orderId }
    ) as { message?: any } | any

    console.log('[mobilizeAsset] make_delivery_note draft response:', JSON.stringify(draftDeliveryNote, null, 2))

    if (!draftDeliveryNote) {
      throw new Error("Failed to create delivery note template from sales order")
    }

    // 3. Extract the delivery note document
    const deliveryNoteDoc = draftDeliveryNote.message || draftDeliveryNote
    
    if (deliveryNoteDoc.name === undefined || deliveryNoteDoc.name === null || deliveryNoteDoc.name === '') {
      delete deliveryNoteDoc.name
    }

    // 4. Link the specific serial number to the delivery note items
    if (deliveryNoteDoc.items && deliveryNoteDoc.items.length > 0) {
      // For the first item, add the serial number
      deliveryNoteDoc.items[0].serial_no = serialNo
      console.log('[mobilizeAsset] Serial number linked to delivery note item:', serialNo)
    }

    // 5. Save the Delivery Note
    const savedDeliveryNote = await frappeRequest('frappe.client.insert', 'POST', {
      doc: deliveryNoteDoc
    }) as { name?: string }

    console.log('[mobilizeAsset] Saved delivery note response:', JSON.stringify(savedDeliveryNote, null, 2))

    if (!savedDeliveryNote || !savedDeliveryNote.name) {
      throw new Error("Failed to save delivery note - no name returned")
    }

    const deliveryNoteId = savedDeliveryNote.name
    console.log('[mobilizeAsset] Delivery note created successfully:', deliveryNoteId)

    // 6. Update Serial Number (Asset) status to "Issued"
    try {
      const serialNoDoc = await frappeRequest('frappe.client.get', 'GET', {
        doctype: 'Serial No',
        name: serialNo
      }) as any

      if (serialNoDoc) {
        await frappeRequest('frappe.client.set_value', 'POST', {
          doctype: 'Serial No',
          name: serialNo,
          fieldname: 'status',
          value: 'Issued'
        })
        console.log('[mobilizeAsset] Serial number status updated to "Issued":', serialNo)
      }
    } catch (serialError) {
      console.warn('[mobilizeAsset] Could not update serial number status:', serialError)
      // Don't fail the entire operation if serial number update fails
    }

    // 7. Revalidate paths
    revalidatePath('/crm')
    revalidatePath('/fleet')
    revalidatePath('/sales-orders')
    revalidatePath(`/sales-orders/${orderId}`)

    console.log('[mobilizeAsset] Asset mobilization completed successfully')
    return { success: true, deliveryNoteId }
  } catch (error: any) {
    console.error('[mobilizeAsset] Error:', {
      message: error.message,
      stack: error.stack,
      fullError: error
    })
    return { error: error.message || 'Failed to mobilize asset' }
  }
}

// 2. RETURN: Create Stock Entry (Material Receipt) to return asset and update Serial Number status
export async function returnAsset(serialNo: string, orderId?: string) {
  try {
    console.log('[returnAsset] Starting asset return - Serial:', serialNo, 'Order:', orderId)
    
    // 1. Fetch the Serial Number (Asset) details
    const asset = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Serial No',
      name: serialNo
    }) as any

    if (!asset) {
      throw new Error("Serial Number (Asset) not found")
    }

    console.log('[returnAsset] Serial number fetched:', asset.name, 'Item:', asset.item_code)

    // 2. Create Stock Entry (Material Receipt type) to bring machine back
    const stockEntryDoc = {
      doctype: 'Stock Entry',
      purpose: 'Material Receipt', // For receiving goods back into inventory
      stock_entry_type: 'Material Receipt',
      from_warehouse: null, // Receiving warehouse
      to_warehouse: asset.warehouse || 'Stores',
      items: [
        {
          doctype: 'Stock Entry Detail',
          item_code: asset.item_code,
          item_name: asset.item_name || asset.item_code,
          serial_no: serialNo,
          qty: 1,
          uom: 'Nos',
          basic_rate: 0,
          basic_amount: 0
        }
      ],
      from_bom: 0,
      inspection_required: 0
    }

    console.log('[returnAsset] Creating stock entry:', JSON.stringify(stockEntryDoc, null, 2))

    // 3. Save the Stock Entry
    const savedStockEntry = await frappeRequest('frappe.client.insert', 'POST', {
      doc: stockEntryDoc
    }) as { name?: string }

    console.log('[returnAsset] Saved stock entry response:', JSON.stringify(savedStockEntry, null, 2))

    if (!savedStockEntry || !savedStockEntry.name) {
      throw new Error("Failed to save stock entry - no name returned")
    }

    const stockEntryId = savedStockEntry.name
    console.log('[returnAsset] Stock entry created successfully:', stockEntryId)

    // 4. Update Serial Number (Asset) status back to "Active"
    try {
      await frappeRequest('frappe.client.set_value', 'POST', {
        doctype: 'Serial No',
        name: serialNo,
        fieldname: 'status',
        value: 'Active'
      })
      console.log('[returnAsset] Serial number status updated to "Active":', serialNo)
    } catch (serialError) {
      console.warn('[returnAsset] Could not update serial number status:', serialError)
      // Don't fail the entire operation if serial number update fails
    }

    // 5. Revalidate paths
    revalidatePath('/crm')
    revalidatePath('/fleet')
    revalidatePath('/sales-orders')

    console.log('[returnAsset] Asset return completed successfully')
    return { success: true, stockEntryId }
  } catch (error: any) {
    console.error('[returnAsset] Error:', {
      message: error.message,
      stack: error.stack,
      fullError: error
    })
    return { error: error.message || 'Failed to return asset' }
  }
}
