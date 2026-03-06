'use server'

import { frappeRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"
import { cookies } from 'next/headers'

export interface Inspection {
  name: string
  reference_name: string
  inspection_type: string
  status: string
  inspected_by: string
  report_date: string
  remarks?: string
  reference_type?: string
}

// 1. READ: List
export async function getInspections() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list', 
      'GET', 
      {
        doctype: 'Quality Inspection',
        fields: '["name", "item_code", "reference_name", "reference_type", "inspection_type", "status", "inspected_by", "report_date"]',
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
    // Get logged-in user from cookies (set by Frappe during login)
    const cookieStore = await cookies()
    const currentUser = cookieStore.get('user_email')?.value || cookieStore.get('user_id')?.value

    const machineValue = formData.get('machine') as string

    // Resolve reference_type and reference_name (both mandatory in ERPNext Quality Inspection).
    // The form sends an item_code; try to find a matching Serial No, otherwise fall back to Item.
    let referenceType = 'Item'
    let referenceName = machineValue

    try {
      // Check if the value itself is a valid Serial No
      await frappeRequest('frappe.client.get', 'GET', {
        doctype: 'Serial No',
        name: machineValue,
        fields: JSON.stringify(['name'])
      })
      referenceType = 'Serial No'
      referenceName = machineValue
    } catch {
      // Not a Serial No — look up by item_code
      try {
        const serialNos = await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'Serial No',
          filters: JSON.stringify([['item_code', '=', machineValue]]),
          fields: JSON.stringify(['name']),
          limit_page_length: 1
        }) as any[]

        if (serialNos && serialNos.length > 0) {
          referenceType = 'Serial No'
          referenceName = serialNos[0].name
        }
        // Otherwise keep referenceType = 'Item', referenceName = machineValue
      } catch (e) {
        console.warn('Could not look up Serial No for item:', machineValue)
      }
    }

    // Prepare Document — reference_type, reference_name, and sample_size are all mandatory
    const inspectionDoc: Record<string, any> = {
        doctype: 'Quality Inspection',
        inspection_type: formData.get('type'),
        reference_type: referenceType,
        reference_name: referenceName,
        item_code: machineValue,
        sample_size: 1,
        report_date: new Date().toISOString().split('T')[0],
        status: formData.get('status'),
        remarks: formData.get('notes'),
        inspected_by: currentUser,
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
export async function getInspection(id: string): Promise<Inspection | null> {
  try {
    const inspection = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Quality Inspection',
      name: decodeURIComponent(id)
    })
    return inspection as Inspection
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
