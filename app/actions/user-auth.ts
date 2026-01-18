'use server'

import { cookies } from 'next/headers'

/**
 * Enhanced Frappe API request helper with proper multi-tenancy support
 */
export async function frappeRequest(
  method: string,
  httpMethod: 'GET' | 'POST' = 'POST',
  params: any = {},
  options: { useUserSession?: boolean; forceSite?: string } = {}
) {
  const cookieStore = await cookies()
  const userType = cookieStore.get('user_type')?.value
  const tenantSubdomain = cookieStore.get('tenant_subdomain')?.value
  const sid = cookieStore.get('sid')?.value

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // CRITICAL FIX: Add X-Frappe-Site-Name header for tenant users
  let siteNameToUse: string | undefined
  
  if (options.forceSite) {
    siteNameToUse = options.forceSite
  } else if (userType === 'tenant' && tenantSubdomain) {
    // Use full domain format: subdomain.rootdomain
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
    siteNameToUse = `${tenantSubdomain}.${rootDomain}`
  }

  if (siteNameToUse) {
    headers['X-Frappe-Site-Name'] = siteNameToUse
    console.log(`[frappeRequest] Targeting site: ${siteNameToUse}`)
  } else {
    console.log(`[frappeRequest] Targeting master site`)
  }

  // Authentication
  if (options.useUserSession !== false && sid) {
    // Use session cookie for user-context requests
    headers['Cookie'] = `sid=${sid}`
    console.log(`[frappeRequest] Using session auth (sid: ${sid.substring(0, 8)}...)`)
  } else {
    // Use API key for admin/system requests
    const apiKey = process.env.ERP_API_KEY
    const apiSecret = process.env.ERP_API_SECRET
    if (apiKey && apiSecret) {
      headers['Authorization'] = `token ${apiKey}:${apiSecret}`
      console.log(`[frappeRequest] Using API key auth`)
    }
  }

  const baseUrl = process.env.ERP_NEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL
  const url = `${baseUrl}/api/method/${method}`

  console.log(`[frappeRequest] ${httpMethod} ${method}`)
  console.log(`[frappeRequest] Site: ${siteNameToUse || '(master)'}`)

  try {
    const fetchOptions: RequestInit = {
      method: httpMethod,
      headers,
      credentials: 'include'
    }

    if (httpMethod === 'POST') {
      fetchOptions.body = JSON.stringify(params)
    } else if (httpMethod === 'GET' && Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams(params).toString()
      const finalUrl = `${url}?${queryParams}`
      const response = await fetch(finalUrl, fetchOptions)
      const data = await response.json()
      return data.message || data
    }

    const response = await fetch(url, fetchOptions)
    const data = await response.json()
    return data.message || data
  } catch (error) {
    console.error(`[frappeRequest] Error:`, error)
    throw error
  }
}

/**
 * User-specific request (always uses session authentication + tenant site)
 */
export async function userRequest(
  method: string,
  httpMethod: 'GET' | 'POST' = 'POST',
  params: any = {}
) {
  return frappeRequest(method, httpMethod, params, { useUserSession: true })
}

/**
 * Tenant data structure from Frappe API
 */
interface TenantData {
  subdomain: string
  site_url: string
  site_config?: string
  status: string
  owner_email: string
}

/**
 * Login result type
 */
type LoginResult = 
  | { success: true; user: string; userType: 'admin'; dashboardUrl: string }
  | { success: true; user: string; subdomain: string; userType: 'tenant'; redirectUrl: string }
  | { success: false; error: string }

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

/**
 * Login to master site (for admin users)
 */
async function loginToMasterSite(usernameOrEmail: string, password: string, masterUrl: string): Promise<LoginResult> {
  try {
    console.log('Attempting master site login to:', masterUrl)
    const response = await fetch(`${masterUrl}/api/method/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        usr: usernameOrEmail,
        pwd: password
      })
    })

    console.log('Master site response status:', response.status)
    const data = await response.json()
    console.log('Master site login response:', data)

    if (data.message === 'Logged In' || data.message === 'No App' || response.ok) {
      const cookieStore = await cookies()
      const setCookieHeader = response.headers.get('set-cookie')
      
      if (setCookieHeader) {
        const sidMatch = setCookieHeader.match(/sid=([^;]+)/)
        if (sidMatch) {
          cookieStore.set('sid', sidMatch[1], {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7
          })
        }
      }

      const userEmail = data.user || (isValidEmail(usernameOrEmail) ? usernameOrEmail : null)
      if (userEmail) {
        cookieStore.set('user_email', userEmail, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7
        })
      }
      
      cookieStore.set('user_type', 'admin', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      })

      return { 
        success: true, 
        user: data.full_name || usernameOrEmail,
        userType: 'admin',
        dashboardUrl: '/dashboard'
      }
    }

    return { 
      success: false, 
      error: 'Invalid credentials. Please check your email and password.' 
    }
  } catch (error: any) {
    console.error('Master site login error:', error)
    return { 
      success: false, 
      error: 'Unable to connect to authentication service.' 
    }
  }
}

export async function loginUser(usernameOrEmail: string, password: string): Promise<LoginResult> {
  try {
    if (!usernameOrEmail || !password) {
      return {
        success: false,
        error: 'Username/Email and password are required'
      }
    }
    
    if (usernameOrEmail.length < 3) {
      return {
        success: false,
        error: 'Invalid username or email'
      }
    }
    
    if (password.length < 6) {
      return {
        success: false,
        error: 'Invalid credentials'
      }
    }
    
    const isEmail = isValidEmail(usernameOrEmail)
    const email = isEmail ? usernameOrEmail : null
    
    const masterUrl = process.env.ERP_NEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL
    const apiKey = process.env.ERP_API_KEY
    const apiSecret = process.env.ERP_API_SECRET
    
    console.log('Attempting login for:', usernameOrEmail)
    
    // Step 1: Check if this is a tenant user (use admin API key - no tenant context needed)
    let tenantData = { message: [] }
    if (email) {
      const tenantLookupResponse = await fetch(`${masterUrl}/api/method/frappe.client.get_list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${apiKey}:${apiSecret}`
          // NO X-Frappe-Site-Name here - we're querying master database
        },
        body: JSON.stringify({
          doctype: 'Tenant',
          filters: { owner_email: email },
          fields: ['subdomain', 'site_url', 'site_config', 'status'],
          limit_page_length: 1
        })
      })
      tenantData = await tenantLookupResponse.json()
    }
    else {
      const userLookupResponse = await fetch(`${masterUrl}/api/method/frappe.client.get_list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${apiKey}:${apiSecret}`
        },
        body: JSON.stringify({
          doctype: 'User',
          filters: { username: usernameOrEmail },
          fields: ['email'],
          limit_page_length: 1
        })
      })
      const userData = await userLookupResponse.json()
      if (userData.message && userData.message.length > 0) {
        const userEmail = userData.message[0].email
        const tenantLookupResponse = await fetch(`${masterUrl}/api/method/frappe.client.get_list`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `token ${apiKey}:${apiSecret}`
          },
          body: JSON.stringify({
            doctype: 'Tenant',
            filters: { owner_email: userEmail },
            fields: ['subdomain', 'site_url', 'site_config', 'status'],
            limit_page_length: 1
          })
        })
        tenantData = await tenantLookupResponse.json()
      }
    }

    console.log('Tenant lookup response:', tenantData)

    const isTenantUser = tenantData.message && tenantData.message.length > 0
    
    if (!isTenantUser) {
      console.log('Not a tenant user, attempting master site login')
      if (!masterUrl) {
        throw new Error('Master site URL not configured')
      }
      return await loginToMasterSite(usernameOrEmail, password, masterUrl)
    }

    const tenant = tenantData.message[0] as TenantData
    
    // Validate tenant status
    if (tenant.status === 'suspended') {
      if (!tenant.site_config) {
        console.error('Tenant provisioning incomplete:', tenant.subdomain)
        return { 
          success: false, 
          error: 'Account setup incomplete. Please try signing up again or contact support.' 
        }
      }
      console.warn('Tenant suspended:', tenant.subdomain)
      return { 
        success: false, 
        error: 'Your account is suspended. Please contact support to reactivate.' 
      }
    }
    
    if (tenant.status === 'cancelled') {
      console.warn('Tenant cancelled:', tenant.subdomain)
      return { 
        success: false, 
        error: 'Your account has been cancelled. Contact support to restore access.' 
      }
    }
    
    if (tenant.status === 'pending') {
      console.info('Tenant provisioning in progress:', tenant.subdomain)
      return { 
        success: false, 
        error: 'Your account is still being set up. This usually takes 2-3 minutes. Please try again shortly.' 
      }
    }

    if (!tenant.site_url) {
      console.error('Missing site_url for tenant:', tenant.subdomain)
      return {
        success: false,
        error: 'Account configuration error. Please contact support.'
      }
    }
    
    if (!tenant.site_url.startsWith('http')) {
      tenant.site_url = `https://${tenant.site_url}`
      console.log('Normalized site_url:', tenant.site_url)
    }

    // Step 2: Authenticate against the tenant's site using X-Frappe-Site-Name
    const siteName = tenant.site_url.replace(/^https?:\/\//, '')
    console.log('Authenticating against tenant site:', siteName)
    
    const response = await fetch(`${masterUrl}/api/method/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Frappe-Site-Name': siteName // CRITICAL: Tell Frappe which site to auth against
      },
      body: new URLSearchParams({
        usr: usernameOrEmail,
        pwd: password
      })
    })

    let data: any
    const responseText = await response.text()
    
    try {
      data = JSON.parse(responseText)
      console.log('Login response:', data)
    } catch (e) {
      console.error('❌ Failed to parse login response as JSON')
      console.error('Response status:', response.status, response.statusText)
      
      if (response.status === 404) {
        return {
          success: false,
          error: 'Workspace not found. Please check your site URL and try again.'
        }
      }
      if (response.status === 403 || response.status === 401) {
        return {
          success: false,
          error: 'Invalid credentials or access denied.'
        }
      }
      if (response.status >= 500) {
        return {
          success: false,
          error: 'Server error. Please try again later.'
        }
      }
      
      return {
        success: false,
        error: 'Unable to connect to your workspace. Please ensure your site is properly configured.'
      }
    }

    if (data.message === 'Logged In' || data.message === 'No App' || response.ok) {
      const cookieStore = await cookies()
      const setCookieHeader = response.headers.get('set-cookie')
      
      if (setCookieHeader) {
        const sidMatch = setCookieHeader.match(/sid=([^;]+)/)
        if (sidMatch) {
          const sessionId = sidMatch[1]
          cookieStore.set('sid', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
          })
          console.log('✅ Session cookie set for user:', email)
        }
      }

      const userEmail = data.user || (isEmail ? usernameOrEmail : null)
      if (userEmail) {
        cookieStore.set('user_email', userEmail, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/'
        })
      }

      // CRITICAL: Store tenant subdomain for X-Frappe-Site-Name in future requests
      cookieStore.set('tenant_subdomain', tenant.subdomain, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      })

      cookieStore.set('tenant_site_url', tenant.site_url, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      })
      
      cookieStore.set('user_type', 'tenant', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      })

      // CRITICAL FIX: Fetch tenant user's API keys for token-based auth
      // Session cookies don't work with X-Frappe-Site-Name, API tokens do
      console.log('Fetching tenant API credentials...')
      try {
        const apiKeysResponse = await fetch(`${masterUrl}/api/method/frappe.client.get_value`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `token ${apiKey}:${apiSecret}`,
            'X-Frappe-Site-Name': siteName
          },
          body: JSON.stringify({
            doctype: 'User',
            name: userEmail,
            fieldname: JSON.stringify(['api_key', 'api_secret'])
          })
        })

        const apiKeysData = await apiKeysResponse.json()
        console.log('API keys response:', apiKeysData)

        if (apiKeysData.message && apiKeysData.message.api_key) {
          cookieStore.set('tenant_api_key', apiKeysData.message.api_key, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
          })
          
          cookieStore.set('tenant_api_secret', apiKeysData.message.api_secret, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
          })
          
          console.log('✅ Tenant API credentials stored')
        } else {
          console.warn('⚠️ No API keys found for tenant user - will need to generate them')
        }
      } catch (apiError) {
        console.error('Failed to fetch API keys:', apiError)
        // Continue anyway - user can still use the app, just might have issues
      }

      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
      const baseHost = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'avariq.in'
      const redirectUrl = `${protocol}://${tenant.subdomain}.${baseHost}/dashboard`
      
      return { 
        success: true, 
        user: data.full_name || email,
        subdomain: tenant.subdomain,
        userType: 'tenant',
        redirectUrl
      }
    }

    return { success: false, error: data.message || 'Invalid credentials' }
  } catch (error: any) {
    console.error('Login error:', error)
    return { success: false, error: error.message }
  }
}

export async function signupUser(data: {
  email: string
  password: string
  fullName: string
  organizationName: string
}) {
  try {
    console.log('Starting signup process for:', data.email)
    
    const passwordErrors = []
    if (data.password.length < 8) {
      passwordErrors.push('at least 8 characters')
    }
    if (!/[A-Z]/.test(data.password)) {
      passwordErrors.push('at least one uppercase letter')
    }
    if (!/[a-z]/.test(data.password)) {
      passwordErrors.push('at least one lowercase letter')
    }
    if (!/[0-9]/.test(data.password)) {
      passwordErrors.push('at least one number')
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(data.password)) {
      passwordErrors.push('at least one special character')
    }
    
    if (passwordErrors.length > 0) {
      return {
        success: false,
        error: `Password must contain ${passwordErrors.join(', ')}`
      }
    }
    
    try {
      const existingUsers = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'User',
        filters: JSON.stringify({ email: data.email }),
        fields: JSON.stringify(['name', 'email']),
        limit_page_length: 1
      }, { useUserSession: false }) // Use API key for user lookup
      
      if (existingUsers && existingUsers.length > 0) {
        console.log('User already exists:', data.email)
        return { 
          success: false, 
          error: 'An account with this email already exists. Please log in instead.' 
        }
      }
    } catch (checkError) {
      console.log('Could not check existing user (may not exist yet):', checkError)
    }
    
    const [firstName, ...lastNameParts] = data.fullName.split(' ')
    const username = data.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
    
    const userDoc = {
      doctype: 'User',
      username: username,
      email: data.email,
      first_name: firstName,
      last_name: lastNameParts.join(' ') || firstName,
      enabled: 1,
      send_welcome_email: 0,
      new_password: data.password
    }

    console.log('Creating user with data:', { email: userDoc.email, firstName: userDoc.first_name })

    try {
      const userResult = await frappeRequest('frappe.client.insert', 'POST', {
        doc: userDoc
      }, { useUserSession: false }) // Use API key for user creation

      if (!userResult) {
        return { success: false, error: 'Failed to create user account. Please try again.' }
      }

      console.log('User created successfully:', userResult)

      await new Promise(resolve => setTimeout(resolve, 1000))

      console.log('Attempting to login new user...')
      const loginResult = await loginUser(data.email, data.password)
      
      if (!loginResult.success) {
        console.warn('Auto-login failed after user creation')
        return { 
          success: false, 
          error: 'Account created successfully! Please log in with your credentials.',
          userCreated: true
        }
      }

      console.log('User logged in successfully')
      return { 
        success: true, 
        user: { email: data.email, fullName: data.fullName },
        needsOnboarding: true,
        organizationName: data.organizationName
      }
    } catch (createError: any) {
      console.error('User creation error:', createError)
      
      const errorMsg = createError.message || ''
      
      if (errorMsg.includes('Invalid Password') || errorMsg.includes('password')) {
        return {
          success: false,
          error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character (!@#$%^&*)'
        }
      }
      
      if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
        return { 
          success: false, 
          error: 'An account with this email already exists. Please log in instead.' 
        }
      }
      
      if (errorMsg.includes('password')) {
        return {
          success: false,
          error: 'Password does not meet requirements. Please use a stronger password.'
        }
      }
      
      if (errorMsg.includes('email') || errorMsg.includes('valid')) {
        return {
          success: false,
          error: 'Please enter a valid email address.'
        }
      }
      
      return { 
        success: false, 
        error: `Failed to create account: ${errorMsg.substring(0, 100)}. Please contact support if the issue persists.` 
      }
    }
  } catch (error: any) {
    console.error('Signup error:', error)
    return { 
      success: false, 
      error: 'An unexpected error occurred. Please check your connection and try again.' 
    }
  }
}

export async function logoutUser() {
  try {
    const erpUrl = process.env.ERP_NEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL
    
    try {
      await fetch(`${erpUrl}/api/method/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
    } catch (error) {
      console.error('ERPNext logout error:', error)
    }
    
    const cookieStore = await cookies()
    cookieStore.delete('sid')
    cookieStore.delete('user_email')
    cookieStore.delete('user_type')
    cookieStore.delete('tenant_subdomain')
    cookieStore.delete('tenant_site_url')
    cookieStore.delete('tenant_api_key')
    cookieStore.delete('tenant_api_secret')
    
    return { success: true }
  } catch (error: any) {
    console.error('Logout error:', error)
    return { success: false, error: error.message }
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const userEmail = cookieStore.get('user_email')?.value || cookieStore.get('user_id')?.value
    
    if (!userEmail) {
      console.log('No user found in cookies')
      return null
    }
    
    console.log('Current user from cookies:', userEmail)
    return userEmail
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

export async function getCurrentUserOrganization() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      console.log('No user logged in')
      return null
    }

    console.log('Fetching organization for user:', user)

    const orgs = await userRequest('frappe.client.get_list', 'GET', {
      doctype: 'Organization Member',
      filters: JSON.stringify({ email: user }),
      fields: JSON.stringify(['organization_slug', 'role']),
      limit_page_length: 1
    })

    if (!orgs || orgs.length === 0) {
      console.log('No organization found for user')
      return null
    }

    const orgList = await userRequest('frappe.client.get_list', 'GET', {
      doctype: 'Organization',
      filters: JSON.stringify({ slug: orgs[0].organization_slug }),
      fields: JSON.stringify(['*']),
      limit_page_length: 1
    })

    if (!orgList || orgList.length === 0) {
      console.log('Organization not found')
      return null
    }

    return { ...orgList[0], userRole: orgs[0].role }
  } catch (error) {
    return null
  }
}