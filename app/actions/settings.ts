'use server'

import { auth } from '@/auth'
import { frappeRequest, userRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"
import { cookies } from 'next/headers'

/**
 * NEW-2 Fix: Require a valid NextAuth session before any mutation.
 * Throws if the caller is not authenticated.
 */
async function assertAuthenticated(): Promise<string> {
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error('Unauthorized: authentication required')
  }
  return session.user.email
}

export interface User {
  name: string // Email
  full_name: string
  role_profile_name?: string
  enabled: number
  email?: string
  first_name?: string
  roles?: string[]
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
    }) as User

    if (!user) {
      console.error('User not found:', userEmail)
      return null
    }

    // frappe.client.get restricts reading the Has Role child table for standard users reading their own profile.
    // We must manually fetch roles using master credentials.
    const { getUserRolesForUser } = await import('@/app/actions/user-roles')
    user.roles = await getUserRolesForUser(userEmail)

    console.log('User profile:', { name: user.name, email: user.email, roles: user.roles })
    return user
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
  // NEW-2 Fix: Require authentication before creating users
  try {
    await assertAuthenticated()
  } catch {
    return { error: 'Unauthorized: authentication required' }
  }

  const roleType = (formData.get('role') as string) || 'member'
  const ROLE_SETS: Record<string, string[]> = {
    admin: ['System Manager'],
    member: ['Employee'],
    sales: ['Sales Manager', 'Sales User'],
    projects: ['Projects Manager', 'Projects User'],
    accounts: ['Accounts Manager', 'Accounts User'],
  }
  const roles = (ROLE_SETS[roleType] || ROLE_SETS.member).map(r => ({ role: r }))

  const userData = {
    doctype: 'User',
    email: formData.get('email'),
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    roles,
    enabled: 1,
    send_welcome_email: 0
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
  // NEW-2 Fix: Require authentication
  try {
    await assertAuthenticated()
  } catch {
    return { error: 'Unauthorized: authentication required' }
  }

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
        // NEW-3 Fix: Use structured filter array instead of string interpolation
        filters: JSON.stringify([
          ['company', '=', company],
          ['account_type', 'in', ['Tax', 'Chargeable']],
          ['is_group', '=', 0]
        ]),
        order_by: 'name',
        limit_page_length: 100
      }
    )
    return accounts as Array<{ name: string, account_name: string }>
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
    }) as any[]
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
  // NEW-2 Fix: Require authentication
  try {
    await assertAuthenticated()
  } catch {
    return { error: 'Unauthorized: authentication required' }
  }

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
    }) as any[];
    if (!companies || companies.length === 0) return []
    const companyName = companies[0].name

    const accounts = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Bank Account',
      fields: '["name", "bank", "bank_account_no", "branch_code", "company", "is_default"]',
      // NEW-3 Fix: structured filter instead of string interpolation
      filters: JSON.stringify([['company', '=', companyName]]),
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
  // NEW-2 Fix: Require authentication
  try {
    await assertAuthenticated()
  } catch {
    return { error: 'Unauthorized: authentication required' }
  }
  try {
    // Get company name
    const companies = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Company',
      fields: '["name"]',
      limit_page_length: 1
    }) as any[];
    if (!companies || companies.length === 0) {
      return { error: 'No company found. Please set up company first.' }
    }
    const companyName = companies[0].name

    // Ensure the Bank record exists (bank field is a Link to Bank doctype)
    try {
      const existingBanks = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Bank',
        fields: '["name"]',
        filters: JSON.stringify([['name', '=', data.bank]]),
        limit_page_length: 1
      }) as any[]
      if (!existingBanks || existingBanks.length === 0) {
        await frappeRequest('frappe.client.insert', 'POST', {
          doc: { doctype: 'Bank', bank_name: data.bank }
        })
      }
    } catch (e: any) {
      // Ignore duplicate errors — bank already exists
      if (!e.message?.includes('Duplicate') && !e.message?.includes('already exists')) {
        console.warn('Could not create Bank record:', e.message)
      }
    }

    const doc = {
      doctype: 'Bank Account',
      account_name: data.bank_account_no, // Required — becomes part of the doc name
      bank: data.bank,
      bank_account_no: data.bank_account_no,
      branch_code: data.branch_code || '',
      company: companyName,
      is_default: data.is_default ? 1 : 0,
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

// ========== FISCAL YEAR MANAGEMENT ==========

export interface FiscalYearInfo {
  name: string
  year: string
  year_start_date?: string
  year_end_date?: string
  disabled?: number
  companyLinked?: boolean
}

function getIndiaFiscalYearForDate(date: Date): {
  fyName: string
  start: Date
  end: Date
} {
  // India-style fiscal year: Apr 1 → Mar 31
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // 1-12
  const startYear = month >= 4 ? year : year - 1
  const endYear = startYear + 1
  const start = new Date(Date.UTC(startYear, 3, 1)) // Apr 1
  const end = new Date(Date.UTC(endYear, 2, 31)) // Mar 31
  return {
    fyName: `${startYear}-${endYear}`,
    start,
    end,
  }
}

export async function getCurrentFiscalYearInfo(): Promise<FiscalYearInfo | null> {
  try {
    const { fyName } = getIndiaFiscalYearForDate(new Date())

    // Prefer ERP session cookie auth (sid) so permissions match the logged-in user.
    // Fall back to token-based requests if session cookie is not present.
    let rows: Array<{
      name: string
      year: string
      year_start_date?: string
      year_end_date?: string
      disabled?: number
    }> = []

    try {
      rows = await userRequest('frappe.client.get_list', 'GET', {
        doctype: 'Fiscal Year',
        fields: '["name","year","year_start_date","year_end_date","disabled"]',
        filters: JSON.stringify([['year', '=', fyName]]),
        limit_page_length: 1,
      }) as any
    } catch {
      rows = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Fiscal Year',
        fields: '["name","year","year_start_date","year_end_date","disabled"]',
        filters: JSON.stringify([['year', '=', fyName]]),
        limit_page_length: 1,
      }) as any
    }

    if (!rows?.length) return null
    const row = rows[0]

    // Company linkage check (best-effort; may be restricted in some permission setups)
    let companyLinked = false
    try {
      const companies = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Company',
        fields: '["name"]',
        limit_page_length: 1,
      }) as Array<{ name: string }>
      const company = companies?.[0]?.name
      if (company) {
        let doc: any
        try {
          doc = await userRequest('frappe.client.get', 'GET', { doctype: 'Fiscal Year', name: row.name }) as any
        } catch {
          doc = await frappeRequest('frappe.client.get', 'GET', { doctype: 'Fiscal Year', name: row.name }) as any
        }
        const linked = Array.isArray(doc?.companies) ? doc.companies : []
        companyLinked = linked.some((c: any) => c?.company === company)
      }
    } catch {
      // ignore
    }

    return {
      name: row.name,
      year: row.year,
      year_start_date: row.year_start_date,
      year_end_date: row.year_end_date,
      disabled: typeof row.disabled === 'number' ? row.disabled : undefined,
      companyLinked,
    }
  } catch (e) {
    console.error('[Fiscal Year] getCurrentFiscalYearInfo failed:', e)
    return null
  }
}

export async function ensureCurrentFiscalYear(): Promise<{ success: boolean; info?: FiscalYearInfo | null; error?: string }> {
  try {
    const { fyName, start, end } = getIndiaFiscalYearForDate(new Date())

    // Resolve tenant company (first company on site)
    const companies = await userRequest('frappe.client.get_list', 'GET', {
      doctype: 'Company',
      fields: '["name"]',
      limit_page_length: 1,
    }) as Array<{ name: string }>
    const company = companies?.[0]?.name

    if (!company) {
      return { success: false, error: 'No Company found on this tenant. Please set up Company in ERPNext first.' }
    }

    const existing = await userRequest('frappe.client.get_list', 'GET', {
      doctype: 'Fiscal Year',
      fields: '["name","year","disabled"]',
      filters: JSON.stringify([['year', '=', fyName]]),
      limit_page_length: 1,
    }) as Array<{ name: string; year: string; disabled?: number }>

    if (!existing?.length) {
      await userRequest('frappe.client.insert', 'POST', {
        doc: {
          doctype: 'Fiscal Year',
          year: fyName,
          year_start_date: start.toISOString().slice(0, 10),
          year_end_date: end.toISOString().slice(0, 10),
          disabled: 0,
          companies: [{ company }],
        }
      })
    } else {
      const name = existing[0].name
      const doc = await userRequest('frappe.client.get', 'GET', { doctype: 'Fiscal Year', name }) as any
      const updated = { ...(doc || {}) }
      updated.disabled = 0
      const currentCompanies = Array.isArray(updated.companies) ? updated.companies : []
      const alreadyLinked = currentCompanies.some((c: any) => c?.company === company)
      if (!alreadyLinked) {
        currentCompanies.push({ company })
        updated.companies = currentCompanies
      }
      await userRequest('frappe.client.save', 'POST', { doc: updated })
    }

    // Set company default fiscal year (best-effort)
    try {
      await userRequest('frappe.client.set_value', 'POST', {
        doctype: 'Company',
        name: company,
        fieldname: { default_fiscal_year: fyName },
      })
    } catch {
      // ignore (some setups restrict writing Company)
    }

    revalidatePath('/settings')
    const info = await getCurrentFiscalYearInfo()
    return { success: true, info }
  } catch (error: any) {
    console.error('[Fiscal Year] ensureCurrentFiscalYear failed:', error)
    const message = error?.message || 'Failed to create fiscal year'
    if (message.includes('Not authenticated - no session cookie found')) {
      return { success: false, error: 'Unauthorized: please login again (missing ERP session cookie).' }
    }
    return { success: false, error: message }
  }
}



