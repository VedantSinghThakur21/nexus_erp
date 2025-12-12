'use server'

import { frappeRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"

export interface Operator {
  name: string
  employee_name: string
  status: string
  designation: string
  date_of_joining: string
  cell_number?: string
  bio?: string // Storing License Number here for MVP
  date_of_birth?: string // Storing License Expiry here for MVP
}

// 1. READ: Get All Operators
export async function getOperators() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list', 
      'GET', 
      {
        doctype: 'Employee',
        // Fetching 'bio' (License No) and 'date_of_birth' (Expiry)
        fields: '["name", "employee_name", "status", "designation", "date_of_joining", "cell_number", "bio", "date_of_birth"]',
        filters: '[["status", "=", "Active"]]',
        order_by: 'creation desc',
        limit_page_length: 50
      }
    )
    return response as Operator[]
  } catch (error) {
    console.error("Failed to fetch operators:", error)
    return []
  }
}

// 2. CREATE: New Operator with License Info
export async function createOperator(formData: FormData) {
  const operatorData = {
    doctype: 'Employee',
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    designation: formData.get('designation') || 'Operator',
    gender: 'Male',
    date_of_joining: new Date().toISOString().split('T')[0],
    status: 'Active',
    cell_number: formData.get('phone'),
    
    // Mapping License Data to standard fields for MVP
    // Ideally, create Custom Fields: 'license_number', 'license_expiry' in ERPNext
    bio: `License: ${formData.get('license_number')}`, 
    date_of_birth: formData.get('license_expiry') // Using DOB field for Expiry date placeholder
  }

  try {
    await frappeRequest('frappe.client.insert', 'POST', { doc: operatorData })
    revalidatePath('/operators')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to create operator' }
  }
}
