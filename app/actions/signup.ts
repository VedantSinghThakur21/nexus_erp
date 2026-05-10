'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { checkSubdomain } from '@/lib/provisioning-client'
import { normalizePlan, toProvisioningPlanType } from '@/types/subscription'

/**
 * Signup Server Action (Step 1 of 2)
 * 
 * Validates input → Checks subdomain availability → Stores pending data → Redirects to /provisioning
 * 
 * DOES NOT provision the site. That happens in the /provisioning page via performProvisioning().
 */
export async function initiateSignup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const organizationName = formData.get('organizationName') as string
  const plan = normalizePlan(formData.get('plan'))

  // ── Validation ──
  if (!email || !password || !organizationName || !fullName) {
    return { success: false, error: 'All fields are required' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Invalid email address' }
  }

  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' }
  }

  if (organizationName.length < 3 || organizationName.length > 50) {
    return { success: false, error: 'Organization name must be 3-50 characters' }
  }

  if (!/^[a-zA-Z0-9\s\-_.]+$/.test(organizationName)) {
    return { success: false, error: 'Organization name contains invalid characters' }
  }

  if (fullName.length < 2 || fullName.length > 100) {
    return { success: false, error: 'Full name must be 2-100 characters' }
  }

  // ── Generate Subdomain ──
  const subdomain = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (subdomain.length < 3 || subdomain.length > 63) {
    return { success: false, error: 'Organization name too short or too long for subdomain' }
  }

  // ── Check Subdomain Availability (via Provisioning Service) ──
  try {
    const check = await checkSubdomain(subdomain)
    if (!check.available) {
      return { success: false, error: `The subdomain "${subdomain}" is already taken. Choose a different name.` }
    }
  } catch (error) {
    console.error('[Signup] Subdomain check failed:', error)
    return { success: false, error: 'Unable to verify subdomain availability. Please try again.' }
  }

  // ── Store Pending Signup Data (secure httpOnly cookie) ──
  const signupData = {
    email,
    password,
    fullName,
    organizationName,
    subdomain,
    plan,
    plan_type: toProvisioningPlanType(plan),
    payment_status: plan === 'free' ? 'not_required' : 'pending',
  }

  const cookieStore = await cookies()
  cookieStore.set('pending_tenant_data', JSON.stringify(signupData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 3600, // 1 hour
    path: '/',
  })

  if (plan === 'free') {
    redirect('/provisioning')
  }

  redirect(`/billing/checkout?plan=${encodeURIComponent(plan)}`)
}
