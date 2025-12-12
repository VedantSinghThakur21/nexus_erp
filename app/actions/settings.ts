'use server'

import { frappeRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"

export interface User {
  name: string // Email
  full_name: string
  role_profile_name?: string
  enabled: number
  email?: string
  first_name?: string
}

// 1. Get Current User Details
export async function getProfile() {
  try {
    const email = await frappeRequest('frappe.auth.get_logged_user')
    const user = await frappeRequest('frappe.client.get', 'GET', {
        doctype: 'User',
        name: email
    })
    return user as User
  } catch (e) {
    return null
  }
}

// 2. Get Team Members
export async function getTeam() {
  try {
    const users = await frappeRequest(
      'frappe.client.get_list', 
      'GET', 
      {
        doctype: 'User',
        fields: '["name", "full_name", "email", "role_profile_name", "enabled", "first_name"]',
        filters: '[["name", "not in", ["Administrator", "Guest"]]]',
        order_by: 'creation desc',
        limit_page_length: 50
      }
    )
    return users as User[]
  } catch (e) {
    console.error("Failed to fetch team:", e)
    return []
  }
}

// 3. Create New Team Member
export async function inviteUser(formData: FormData) {
  const userData = {
    doctype: 'User',
    email: formData.get('email'),
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    role_profile_name: formData.get('role'), // e.g. "Sales User"
    enabled: 1,
    send_welcome_email: 0 // Set to 1 if email is configured
  }

  try {
    await frappeRequest('frappe.client.insert', 'POST', { doc: userData })
    revalidatePath('/settings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to invite user' }
  }
}
