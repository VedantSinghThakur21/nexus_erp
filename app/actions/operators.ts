'use server'

import { frappeRequest, getTenantContext } from "@/app/lib/api"
import { revalidatePath } from "next/cache"
import { listTenantEmployees, createTenantEmployee } from "@/lib/provisioning-client"

export interface Operator {
  name: string
  employee_name: string
  status: string
  date_of_joining: string
  cell_number?: string
  bio?: string // Storing License Number here for MVP
  date_of_birth?: string // Storing License Expiry here for MVP
}

function isPermissionError(error: unknown): boolean {
  const message = String((error as Error)?.message || '')
  return (
    message.includes('PermissionError') ||
    message.includes('does not have doctype access') ||
    message.includes('Insufficient Permission')
  )
}

// 1. READ: Get All Operators
export async function getOperators() {
  // Primary: tenant user's own Frappe credentials
  try {
    const response = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Employee',
        // Fetching 'bio' (License No) and 'date_of_birth' (Expiry)
        fields: '["name", "employee_name", "status", "date_of_joining", "cell_number", "bio", "date_of_birth"]',
        filters: '[["status", "=", "Active"]]',
        order_by: 'creation desc',
        limit_page_length: 50
      }
    )
    return response as Operator[]
  } catch (error) {
    if (!isPermissionError(error)) {
      console.error("Failed to fetch operators:", error)
      return []
    }
    // Fallback: provisioning service (ignore_permissions)
    try {
      const ctx = await getTenantContext()
      if (!ctx.subdomain) return []
      const res = await listTenantEmployees(ctx.subdomain)
      return (res.employees || []) as Operator[]
    } catch (fallbackError) {
      console.error("[operators] Provisioning fallback failed:", fallbackError)
      return []
    }
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
    const dateOfBirth = formData.get('date_of_birth')?.toString() || ''
    const gender = formData.get('gender')?.toString() || ''
    const licenseNumber = formData.get('license_number')?.toString() || ''
    const licenseExpiry = formData.get('license_expiry')?.toString() || ''
    const dateOfJoining = formData.get('date_of_joining')?.toString() || new Date().toISOString().split('T')[0]

    // Validate required fields
    if (!firstName.trim()) {
      throw new Error('First name is required')
    }
    if (!dateOfBirth) {
      throw new Error('Date of birth is required')
    }
    if (!gender) {
      throw new Error('Gender is required')
    }

    // Build operator data for ERPNext Employee doctype
    const operatorData = {
      doctype: 'Employee',
      first_name: firstName,
      last_name: lastName,
      employee_name: `${firstName} ${lastName}`.trim(),
      date_of_birth: dateOfBirth,
      date_of_joining: dateOfJoining,
      gender,
      status: 'Active',
      cell_number: phone,
      email: email,

      // Store license info in bio field
      bio: licenseNumber ? `License: ${licenseNumber}${licenseExpiry ? ` | Expires: ${licenseExpiry}` : ''}` : ''
    }

    console.log('Creating operator with data:', operatorData)

    // Primary: tenant user's own Frappe credentials
    try {
      const response = await frappeRequest('frappe.client.insert', 'POST', { doc: operatorData })
      console.log('Operator created successfully:', response)
      revalidatePath('/operators')
      return { success: true, data: response }
    } catch (error) {
      if (!isPermissionError(error)) throw error

      // Fallback: provisioning service (ignore_permissions)
      const ctx = await getTenantContext()
      if (!ctx.subdomain) throw error
      const result = await createTenantEmployee(ctx.subdomain, {
        first_name: firstName,
        last_name: lastName,
        email,
        cell_number: phone,
        date_of_birth: dateOfBirth,
        date_of_joining: dateOfJoining,
        gender,
        status: 'Active',
        bio: operatorData.bio,
      })
      console.log('[operators] Operator created via provisioning service:', result.employee?.name)
      revalidatePath('/operators')
      return { success: true, data: result.employee }
    }
  } catch (error: any) {
    console.error('Error creating operator:', error)
    const errorMessage = error?.message || 'Failed to create operator'
    return { error: errorMessage, success: false }
  }
}



