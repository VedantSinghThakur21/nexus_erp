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
    // 1. Get Current User (The Inspector) from cookies
    const { cookies: cookiesModule } = await import('next/headers')
    const cookieStore = await cookiesModule()
    const currentUser = cookieStore.get('user_email')?.value

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

// 3. READ: Get Single Inspection
export async function getInspection(id: string) {
  try {
    const inspection = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Quality Inspection',
      name: decodeURIComponent(id)
    })
    return inspection
  } catch (error) {
    console.error("Failed to fetch inspection:", error)
    return null
  }
}

// 4. UPDATE: Update Inspection Status
export async function updateInspection(inspectionId: string, formData: FormData) {
  try {
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Quality Inspection',
      name: inspectionId,
      fieldname: {
        status: formData.get('status'),
        remarks: formData.get('remarks')
      }
    })
    revalidatePath(`/inspections/${inspectionId}`)
    revalidatePath('/inspections')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to update inspection' }
  }
}

// 5. GET: Get Inspections for an Asset
export async function getAssetInspections(assetId: string) {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Quality Inspection',
        fields: '["name", "inspection_type", "status", "report_date", "inspected_by", "remarks"]',
        filters: `[["reference_name", "=", "${decodeURIComponent(assetId)}"]]`,
        order_by: 'report_date desc',
        limit_page_length: 20
      }
    )
    return response as Inspection[]
  } catch (error) {
    console.error('Failed to fetch asset inspections:', error)
    return []
  }
}
