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
  try {
    // Extract form data
    const firstName = formData.get('first_name')?.toString() || ''
    const lastName = formData.get('last_name')?.toString() || ''
    const email = formData.get('email')?.toString() || ''
    const phone = formData.get('phone')?.toString() || ''
    const designation = formData.get('designation')?.toString() || 'Operator'
    const licenseNumber = formData.get('license_number')?.toString() || ''
    const licenseExpiry = formData.get('license_expiry')?.toString() || ''
    const dateOfJoining = formData.get('date_of_joining')?.toString() || new Date().toISOString().split('T')[0]

    // Validate required fields
    if (!firstName.trim()) {
      throw new Error('First name is required')
    }

    // Build operator data for ERPNext Employee doctype
    const operatorData = {
      doctype: 'Employee',
      first_name: firstName,
      last_name: lastName,
      employee_name: `${firstName} ${lastName}`.trim(),
      designation: designation,
      gender: 'Male', // Can be extended to form input
      date_of_joining: dateOfJoining,
      status: 'Active',
      cell_number: phone,
      email: email,
      
      // Mapping License Data to standard fields (MVP approach)
      // Note: Custom fields 'license_number', 'license_expiry' should be added to Employee doctype in ERPNext
      bio: licenseNumber ? `License: ${licenseNumber}` : '', 
      date_of_birth: licenseExpiry || null // Using DOB field as placeholder for Expiry date
    }

    console.log('Creating operator with data:', operatorData)

    const response = await frappeRequest('frappe.client.insert', 'POST', { doc: operatorData })
    
    console.log('Operator created successfully:', response)

    revalidatePath('/operators')
    return { success: true, data: response }
  } catch (error: any) {
    console.error('Error creating operator:', error)
    const errorMessage = error.message || 'Failed to create operator'
    return { error: errorMessage, success: false }
  }
}
