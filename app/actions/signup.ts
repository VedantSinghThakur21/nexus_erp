'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { masterRequest } from '@/app/lib/api'

export async function initiateSignup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const organizationName = formData.get('organizationName') as string
  const plan = formData.get('plan') as string || 'Free'

  // Validation: Required Fields
  if (!email || !password || !organizationName || !fullName) {
    return { success: false, error: 'All fields are required' }
  }

  // Validation: Email Format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Invalid email address format' }
  }

  // Validation: Password Strength (min 8 chars, uppercase, lowercase, number)
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  if (!passwordRegex.test(password)) {
    return { success: false, error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' }
  }

  // Validation: Organization Name (3-50 chars, alphanumeric + spaces)
  if (organizationName.length < 3 || organizationName.length > 50) {
    return { success: false, error: 'Organization name must be between 3 and 50 characters' }
  }

  if (!/^[a-zA-Z0-9\s\-_.]+$/.test(organizationName)) {
    return { success: false, error: 'Organization name contains invalid characters' }
  }

  // Validation: Full Name (2-100 chars)
  if (fullName.length < 2 || fullName.length > 100) {
    return { success: false, error: 'Full name must be between 2 and 100 characters' }
  }

  // Validation: Plan Type
  const validPlans = ['free', 'pro', 'enterprise']
  if (!validPlans.includes(plan.toLowerCase())) {
    return { success: false, error: 'Invalid plan selection' }
  }

  // 1. Generate Subdomain from Org Name
  const subdomain = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  // Validate subdomain length (3-63 chars per DNS spec)
  if (subdomain.length < 3 || subdomain.length > 63) {
    return { success: false, error: 'Organization name too short or too long for subdomain creation' }
  }

  // 2. Check Subdomain Availability in Master DB (SaaS Tenant)
  try {
    const existing = await masterRequest('frappe.client.get_value', 'GET', {
      doctype: 'SaaS Tenant',
      fieldname: 'name',
      filters: { subdomain: subdomain }
    }) as any

    if (existing && existing.name) {
      return { success: false, error: `The subdomain "${subdomain}" is already taken. Please choose a different organization name.` }
    }
  } catch (error) {
    console.error("SaaS Tenant Subdomain Check Failed:", error)
    return { success: false, error: 'Unable to verify subdomain availability. Please try again.' }
  }

  // 3. Check Email Uniqueness (prevent multiple tenants per email)
  try {
    const emailExists = await masterRequest('frappe.client.get_count', 'GET', {
      doctype: 'SaaS Tenant',
      filters: { owner_email: email }
    }) as any

    if (emailExists && emailExists > 0) {
      return { success: false, error: 'An account with this email already exists. Please use a different email.' }
    }
  } catch (error) {
    console.error("SaaS Tenant Email Check Failed:", error)
    // Don't fail on this check, proceed
    console.warn("Proceeding despite email uniqueness check failure")

  // 3. Store Data in Secure Cookie
  // We need this data on the /provisioning page to actually run the script
  const signupData = {
    email,
    password,
    fullName,
    organizationName,
    subdomain,
    plan
  }

  const cookieStore = await cookies()
  const oneHour = 60 * 60 * 1000

  cookieStore.set('pending_tenant_data', JSON.stringify(signupData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: oneHour,
    path: '/'
  })

  // 4. Redirect to Provisioning Page
  redirect('/provisioning')
}
