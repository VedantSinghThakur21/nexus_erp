'use server'

import { headers } from 'next/headers'

interface JoinTenantResult {
  success: boolean
  error?: string
  limitReached?: boolean
}

/**
 * Server Action: Join a Tenant as a new user
 * 
 * Called from tesla.avariq.in/signup.
 * 
 * Steps:
 * 1. Read x-tenant-id header (injected by middleware)
 * 2. Check SaaS Settings.max_users limit on the tenant site
 * 3. Check if user already exists
 * 4. Create User in ERPNext via frappe.client.insert
 * 
 * The tenant site name is derived from x-tenant-id header.
 */
export async function joinTenant(formData: FormData): Promise<JoinTenantResult> {
  try {
    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    // ── Validate inputs ──
    if (!fullName || !email || !password) {
      return { success: false, error: 'All fields are required.' }
    }

    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.' }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Invalid email address.' }
    }

    // ── Get tenant from middleware header ──
    const headersList = await headers()
    const tenantId = headersList.get('x-tenant-id')

    if (!tenantId || tenantId === 'master') {
      return {
        success: false,
        error: 'Cannot create user on the root domain. Please use a workspace URL.',
      }
    }

    // ── Resolve tenant site name ──
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
    const isProduction = process.env.NODE_ENV === 'production'
    const tenantSiteName = isProduction
      ? `${tenantId}.${rootDomain}`
      : `${tenantId}.localhost`

    const masterUrl = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
    const apiKey = process.env.ERP_API_KEY
    const apiSecret = process.env.ERP_API_SECRET

    if (!apiKey || !apiSecret) {
      console.error('[joinTenant] Missing master API credentials')
      return { success: false, error: 'Server configuration error.' }
    }

    const authHeader = `token ${apiKey}:${apiSecret}`

    // ── Step 1: Check user limit from SaaS Settings ──
    let maxUsers = 5 // sensible default
    try {
      const settingsRes = await fetch(
        `${masterUrl}/api/method/frappe.client.get_single_value`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
            'X-Frappe-Site-Name': tenantSiteName,
            Host: tenantSiteName,
          },
          body: JSON.stringify({
            doctype: 'SaaS Settings',
            field: 'max_users',
          }),
        },
      )
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        const val = settingsData.message
        if (typeof val === 'number' && val > 0) {
          maxUsers = val
        }
      }
    } catch (err) {
      console.warn('[joinTenant] Could not fetch SaaS Settings, using default:', err)
    }

    // ── Step 2: Count existing users ──
    let currentUserCount = 0
    try {
      const countRes = await fetch(
        `${masterUrl}/api/method/frappe.client.get_count`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
            'X-Frappe-Site-Name': tenantSiteName,
            Host: tenantSiteName,
          },
          body: JSON.stringify({
            doctype: 'User',
            filters: { enabled: 1, user_type: 'System User' },
          }),
        },
      )
      if (countRes.ok) {
        const countData = await countRes.json()
        currentUserCount = countData.message || 0
      }
    } catch (err) {
      console.warn('[joinTenant] Could not count users:', err)
    }

    if (currentUserCount >= maxUsers) {
      return {
        success: false,
        limitReached: true,
        error: `This workspace has reached its user limit (${maxUsers}). Ask the workspace admin to upgrade the plan.`,
      }
    }

    // ── Step 3: Check if user already exists ──
    try {
      const existsRes = await fetch(
        `${masterUrl}/api/method/frappe.client.get_count`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
            'X-Frappe-Site-Name': tenantSiteName,
            Host: tenantSiteName,
          },
          body: JSON.stringify({
            doctype: 'User',
            filters: { name: email },
          }),
        },
      )
      if (existsRes.ok) {
        const existsData = await existsRes.json()
        if (existsData.message && existsData.message > 0) {
          return {
            success: false,
            error: 'A user with this email already exists on this workspace.',
          }
        }
      }
    } catch (err) {
      console.warn('[joinTenant] User existence check failed:', err)
    }

    // ── Step 4: Create user via frappe.client.insert ──
    const [firstName, ...lastParts] = fullName.trim().split(' ')
    const lastName = lastParts.join(' ')

    const createRes = await fetch(
      `${masterUrl}/api/method/frappe.client.insert`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
          'X-Frappe-Site-Name': tenantSiteName,
          Host: tenantSiteName,
        },
        body: JSON.stringify({
          doc: {
            doctype: 'User',
            email,
            first_name: firstName,
            last_name: lastName || undefined,
            new_password: password,
            send_welcome_email: 0,
            user_type: 'System User',
            enabled: 1,
            roles: [
              { role: 'System Manager' }, // Adjust based on your needs
            ],
          },
        }),
      },
    )

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}))
      const errMsg =
        errData?.exc_type === 'DuplicateEntryError'
          ? 'A user with this email already exists.'
          : errData?.message || 'Failed to create user account.'
      console.error('[joinTenant] User creation failed:', errData)
      return { success: false, error: errMsg }
    }

    console.log(`[joinTenant] ✅ User ${email} created on tenant ${tenantId}`)

    return { success: true }
  } catch (error: any) {
    console.error('[joinTenant] Unexpected error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}
