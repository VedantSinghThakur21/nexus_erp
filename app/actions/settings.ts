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

// 4. TAX TEMPLATES

export interface TaxTemplate {
  name: string
  title: string
  company: string
  is_default?: number
}

export interface TaxTemplateDetail {
  name: string
  title: string
  company: string
  is_default?: number
  taxes?: Array<{
    charge_type: string
    account_head: string
    description: string
    rate: number
  }>
}

// Get all tax templates
export async function getTaxTemplates() {
  try {
    const templates = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Sales Taxes and Charges Template',
        fields: '["name", "title", "company", "is_default"]',
        order_by: 'creation desc',
        limit_page_length: 100
      }
    )
    return templates as TaxTemplate[]
  } catch (error) {
    console.error("Failed to fetch tax templates:", error)
    return []
  }
}

// Get single tax template with details
export async function getTaxTemplate(name: string) {
  try {
    const template = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Sales Taxes and Charges Template',
      name: name
    })
    return template as TaxTemplateDetail
  } catch (error) {
    console.error("Failed to fetch tax template:", error)
    return null
  }
}

// Create new tax template
export async function createTaxTemplate(data: {
  title: string
  company: string
  taxes: Array<{
    charge_type: string
    account_head: string
    description: string
    rate: number
  }>
}) {
  try {
    const doc = {
      doctype: 'Sales Taxes and Charges Template',
      title: data.title,
      company: data.company,
      taxes: data.taxes.map((tax, idx) => ({
        idx: idx + 1,
        doctype: 'Sales Taxes and Charges',
        ...tax
      }))
    }

    const template = await frappeRequest('frappe.client.insert', 'POST', { doc })
    revalidatePath('/settings')
    return { success: true, template }
  } catch (error: any) {
    console.error("Failed to create tax template:", error)
    return { error: error.message || 'Failed to create tax template' }
  }
}

// Get available tax accounts for a company
export async function getTaxAccounts(company: string) {
  try {
    const accounts = await frappeRequest(
      'frappe.client.get_list',
      'GET',
      {
        doctype: 'Account',
        fields: '["name", "account_name"]',
        filters: `[["company", "=", "${company}"], ["account_type", "in", ["Tax", "Chargeable"]]]`,
        order_by: 'name',
        limit_page_length: 100
      }
    )
    return accounts as Array<{name: string, account_name: string}>
  } catch (error) {
    console.error("Failed to fetch tax accounts:", error)
    return []
  }
}
