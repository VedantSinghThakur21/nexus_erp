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

    // Resolve a Serial No to use as reference_type/reference_name.
    // Quality Inspection requires reference_type + reference_name (both mandatory).
    // Strategy: find or create a Serial No for this item.
    let serialNoName: string | null = null

    // Step 1: check if machineValue is itself a Serial No name
    try {
      await frappeRequest('frappe.client.get', 'GET', {
        doctype: 'Serial No',
        name: machineValue,
        fields: JSON.stringify(['name'])
      })
      serialNoName = machineValue
    } catch {
      // Step 2: look up by item_code
      try {
        const serialNos = await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'Serial No',
          filters: JSON.stringify([['item_code', '=', machineValue]]),
          fields: JSON.stringify(['name']),
          limit_page_length: 1
        }) as any[]
        if (serialNos && serialNos.length > 0) {
          serialNoName = serialNos[0].name
        }
      } catch (e) {
        console.warn('Could not look up Serial No for item:', machineValue)
      }
    }

    // Step 3: create a Serial No if none found (bare creation works in ERPNext without stock entry)
    if (!serialNoName) {
      console.log(`No Serial No found for ${machineValue}, creating one`)
      try {
        const created = await frappeRequest('frappe.client.insert', 'POST', {
          doc: {
            doctype: 'Serial No',
            item_code: machineValue,
            serial_no: machineValue,
            status: 'Active'
          }
        }) as any
        serialNoName = created.name || machineValue
      } catch (createErr: any) {
        console.warn('Could not create Serial No, will try Delivery Note fallback:', createErr.message)
      }
    }

    // Step 4: if still no Serial No, fall back to a Delivery Note linked to this item
    let referenceType = 'Serial No'
    let referenceName = serialNoName || machineValue

    if (!serialNoName) {
      try {
        const dns = await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'Delivery Note',
          fields: JSON.stringify(['name']),
          filters: JSON.stringify([['Delivery Note Item', 'item_code', '=', machineValue]]),
          order_by: 'creation desc',
          limit_page_length: 1
        }) as any[]
        if (dns && dns.length > 0) {
          referenceType = 'Delivery Note'
          referenceName = dns[0].name
        } else {
          // Last resort: Stock Entry
          const stes = await frappeRequest('frappe.client.get_list', 'GET', {
            doctype: 'Stock Entry',
            fields: JSON.stringify(['name']),
            filters: JSON.stringify([['Stock Entry Detail', 'item_code', '=', machineValue]]),
            order_by: 'creation desc',
            limit_page_length: 1
          }) as any[]
          if (stes && stes.length > 0) {
            referenceType = 'Stock Entry'
            referenceName = stes[0].name
          }
        }
      } catch (e) {
        console.warn('Could not find fallback reference document for inspection')
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
