'use server'

import { frappeRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"

export interface Inspection {
  name: string
  reference_name: string
  inspection_type: string
  status: string
  inspected_by: string
  report_date: string
}

// 1. READ: List
export async function getInspections() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list', 
      'GET', 
      {
        doctype: 'Quality Inspection',
        fields: '["name", "reference_name", "inspection_type", "status", "inspected_by", "report_date"]',
        filters: '[["reference_type", "=", "Serial No"]]',
        order_by: 'creation desc',
        limit_page_length: 50
      }
    )
    return response as Inspection[]
  } catch (error) {
    console.error("Failed to fetch inspections:", error)
    return []
  }
}

// 2. CREATE: New Inspection
export async function createInspection(formData: FormData) {
  try {
    // 1. Get Current User (The Inspector)
    const currentUser = await frappeRequest('frappe.auth.get_logged_user')

    // 2. Prepare Document
    const inspectionDoc = {
        doctype: 'Quality Inspection',
        inspection_type: formData.get('type'),
        reference_type: 'Serial No',
        reference_name: formData.get('machine'),
        report_date: new Date().toISOString().split('T')[0],
        status: formData.get('status'),
        remarks: formData.get('notes'),
        inspected_by: currentUser // FIX: Assign the logged-in user
    }

    await frappeRequest('frappe.client.insert', 'POST', { doc: inspectionDoc })
    
    revalidatePath('/inspections')
    return { success: true }
  } catch (error: any) {
    console.error("Create inspection error:", error)
    return { error: error.message || 'Failed to create inspection' }
  }
}
