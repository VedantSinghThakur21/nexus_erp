'use server'

import { frappeRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"

export interface Lead {
  name: string
  lead_name: string
  email_id: string
  mobile_no: string
  status: string
  company_name: string
  job_title?: string
  territory?: string
}

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
