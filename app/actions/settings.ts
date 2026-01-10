'use server'

import { frappeRequest, userRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"
import { cookies } from 'next/headers'

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
    // Get logged-in user email from cookies (set by Frappe during login)
    const cookieStore = await cookies()
    const userEmail = cookieStore.get('user_email')?.value || cookieStore.get('user_id')?.value
    
    if (!userEmail) {
      console.error('No logged-in user found in cookies')
      return null
    }
    
    console.log('Getting profile for user:', userEmail)
    
    // Use frappe.client.get (whitelisted) to fetch single user document
    const user = await userRequest('frappe.client.get', 'GET', {
      doctype: 'User',
      name: userEmail,
      fields: JSON.stringify(['name', 'full_name', 'email', 'first_name', 'role_profile_name', 'enabled'])
    })
    
    if (!user) {
      console.error('User not found:', userEmail)
      return null
    }
    
    console.log('User profile:', user)
    return user as User
  } catch (e) {
    console.error('Get profile error:', e)
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

// ========== COMPANY MANAGEMENT ==========

export interface Company {
  name: string
  company_name: string
  abbr: string
  tax_id?: string // GSTIN
  country?: string
  default_currency?: string
}

// Get company details
export async function getCompany() {
  try {
    const companies = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Company',
      fields: '["name", "company_name", "abbr", "tax_id", "country", "default_currency"]',
      limit_page_length: 1
    })
    return companies[0] as Company || null
  } catch (error) {
    console.error("Failed to fetch company:", error)
    return null
  }
}

// Update company details
export async function updateCompany(data: {
  name: string
  company_name?: string
  tax_id?: string
  country?: string
}) {
  try {
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Company',
      name: data.name,
      fieldname: {
        ...(data.company_name && { company_name: data.company_name }),
        ...(data.tax_id && { tax_id: data.tax_id }),
        ...(data.country && { country: data.country })
      }
    })
    revalidatePath('/settings')
    return { success: true }
  } catch (error: any) {
    console.error("Failed to update company:", error)
    return { error: error.message || 'Failed to update company' }
  }
}

// ========== BANK ACCOUNT MANAGEMENT ==========

export interface BankAccount {
  name: string
  bank: string
  bank_account_no: string
  branch_code?: string // IFSC
  company: string
  is_default: number
}

// Get bank accounts for company
export async function getBankAccounts() {
  try {
    // First get company
    const companies = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Company',
      fields: '["name"]',
      limit_page_length: 1
    })
    
    if (!companies || companies.length === 0) return []
    const companyName = companies[0].name

    const accounts = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Bank Account',
      fields: '["name", "bank", "bank_account_no", "branch_code", "company", "is_default"]',
      filters: `[["company", "=", "${companyName}"]]`,
      order_by: 'is_default desc, creation desc',
      limit_page_length: 10
    })
    return accounts as BankAccount[]
  } catch (error) {
    console.error("Failed to fetch bank accounts:", error)
    return []
  }
}

// Create bank account
export async function createBankAccount(data: {
  bank: string
  bank_account_no: string
  branch_code?: string
  is_default?: boolean
}) {
  try {
    // Get company name
    const companies = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Company',
      fields: '["name"]',
      limit_page_length: 1
    })
    
    if (!companies || companies.length === 0) {
      return { error: 'No company found. Please set up company first.' }
    }
    const companyName = companies[0].name

    const doc = {
      doctype: 'Bank Account',
      bank: data.bank,
      bank_account_no: data.bank_account_no,
      branch_code: data.branch_code || '',
      company: companyName,
      is_default: data.is_default ? 1 : 0,
      account_type: 'Bank',
      is_company_account: 1
    }

    await frappeRequest('frappe.client.insert', 'POST', { doc })
    revalidatePath('/settings')
    return { success: true }
  } catch (error: any) {
    console.error("Failed to create bank account:", error)
    return { error: error.message || 'Failed to create bank account' }
  }
}

// Update bank account
export async function updateBankAccount(name: string, data: {
  bank?: string
  bank_account_no?: string
  branch_code?: string
  is_default?: boolean
}) {
  try {
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Bank Account',
      name: name,
      fieldname: {
        ...(data.bank && { bank: data.bank }),
        ...(data.bank_account_no && { bank_account_no: data.bank_account_no }),
        ...(data.branch_code !== undefined && { branch_code: data.branch_code }),
        ...(data.is_default !== undefined && { is_default: data.is_default ? 1 : 0 })
      }
    })
    revalidatePath('/settings')
    return { success: true }
  } catch (error: any) {
    console.error("Failed to update bank account:", error)
    return { error: error.message || 'Failed to update bank account' }
  }
}
