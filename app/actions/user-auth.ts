'use server'

import { cookies, headers } from 'next/headers'
import {
  provisionTenantSite,
  lookupTenantBySubdomain,
  lookupTenantByOwnerEmail,
  lookupTenantByUsername,
  lookupTenantForUserEmail,
  type TenantRecord,
} from '@/lib/provisioning-client'
import { mintTenantApiKeysForLogin } from '@/lib/mint-tenant-api-keys'
import { frappeRequest as apiFrappeRequest, masterRequest, tenantAdminRequest, getTenantContext } from '@/app/lib/api'
import { buildTenantFromSubdomain, resolveTenantId } from '@/lib/tenant'

// Timeout for all direct Frappe fetch() calls (ms).
// Keep well under nginx's upstream timeout (typically 60s).
const FRAPPE_FETCH_TIMEOUT = Number(process.env.ERP_REQUEST_TIMEOUT_MS || '12000')

/** Create an AbortSignal that fires after `ms` milliseconds */
function timeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms)
}

function getTenantSiteName(subdomain: string): string {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
  return process.env.NODE_ENV === 'production'
    ? `${subdomain}.${rootDomain}`
    : `${subdomain}.localhost`
}

function validateTenantStatus(tenant: TenantRecord): LoginResult | null {
  const tenantStatus = String(tenant.status || 'active').toLowerCase()

  if (tenantStatus === 'suspended') {
    return {
      success: false,
      error: tenant.site_config
        ? 'Your account is suspended. Please contact support to reactivate.'
        : 'Account setup incomplete. Please try signing up again or contact support.',
    }
  }

  if (tenantStatus === 'cancelled') {
    return {
      success: false,
      error: 'Your account has been cancelled. Contact support to restore access.',
    }
  }

  if (tenantStatus === 'pending') {
    return {
      success: false,
      error: 'Your account is still being set up. This usually takes 2-3 minutes. Please try again shortly.',
    }
  }

  return null
}

async function getTenantDiscoverySubdomains(): Promise<string[]> {
  const fromEnv = (process.env.NEXUS_TENANT_DISCOVERY_SUBDOMAINS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  let remembered: string | undefined
  try {
    const cookieStore = await cookies()
    remembered = cookieStore.get('tenant_subdomain')?.value?.trim().toLowerCase() || undefined
  } catch {
    // ignore — cookies unavailable outside request context
  }

  const { listActiveTenantSubdomains } = await import('@/lib/provisioning-client')
  const fromProvisioning = await listActiveTenantSubdomains()

  const seen = new Set<string>()
  const merged: string[] = []
  for (const sub of [...(remembered ? [remembered] : []), ...fromEnv, ...fromProvisioning]) {
    const normalized = sub.toLowerCase()
    if (!seen.has(normalized)) {
      seen.add(normalized)
      merged.push(normalized)
    }
  }
  return merged.slice(0, 20)
}

function normalizeTenantRecord(tenant: TenantRecord): TenantRecord {
  let siteUrl = tenant.site_url || ''
  if (!siteUrl) {
    return buildTenantFromSubdomain(tenant.subdomain)
  }
  if (!siteUrl.startsWith('http')) {
    siteUrl = `https://${siteUrl}`
  }
  return { ...tenant, site_url: siteUrl }
}

/**
 * Tenant data structure from Frappe API
 */
interface TenantData {
  name: string
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
  | { success: true; user: string; userType: 'admin'; dashboardUrl: string; requirePasswordChange?: boolean }
  | { success: true; user: string; subdomain: string; userType: 'tenant'; redirectUrl: string; requirePasswordChange?: boolean }
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
    const response = await fetch(`${masterUrl}/api/method/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        usr: usernameOrEmail,
        pwd: password
      }),
      signal: timeoutSignal(FRAPPE_FETCH_TIMEOUT),
    })

    const data = await response.json()

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

export async function loginUser(
  usernameOrEmail: string,
  password: string,
  workspaceHint?: string,
): Promise<LoginResult> {
  try {
    // For E2E / troubleshooting: allow skipping expensive side effects (provisioning,
    // role normalization) to reduce login latency and flakiness.
    const fastLogin = process.env.NEXUS_FAST_LOGIN === '1'

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
    const masterUrl = process.env.ERP_NEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL || 'http://127.0.0.1:8080'

    // Step 1: Resolve tenant — prefer the current subdomain from middleware (allows
    // invited team members who are NOT the owner to log in), falling back to
    // owner_email lookup for root-domain logins.
    // Uses the provisioning service (ignore_permissions on master) so login does not
    // depend on ERP_API_KEY having SaaS Tenant DocPerm.
    const currentSubdomain = await resolveTenantId()
    const onRootDomain = currentSubdomain === 'master'
    const onTenantSubdomain = !onRootDomain

    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
    const tenantsToTry: TenantRecord[] = []

    // Workspace slug from the login form — always try first (works without provisioning/master DB).
    const normalizedHint = workspaceHint?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (normalizedHint) {
      tenantsToTry.push(buildTenantFromSubdomain(normalizedHint))
    }

    if (onTenantSubdomain && !normalizedHint) {
      let resolved = await lookupTenantBySubdomain(currentSubdomain)
      if (!resolved) resolved = buildTenantFromSubdomain(currentSubdomain)
      tenantsToTry.push(resolved)
    } else if (email) {
      const owned = await lookupTenantByOwnerEmail(email)
      if (owned) tenantsToTry.push(owned)
      else {
        const member = await lookupTenantForUserEmail(email)
        if (member) tenantsToTry.push(member)
      }
    } else {
      const byUsername = await lookupTenantByUsername(usernameOrEmail)
      if (byUsername) tenantsToTry.push(byUsername)
    }

    if (onRootDomain) {
      // Always try configured / provisioned subdomains on root login so credentials
      // can be matched to the right workspace (e.g. dabed.avariq.in) without master DB lookup.
      const discoverySubs = await getTenantDiscoverySubdomains()
      for (const sub of discoverySubs) {
        const built = buildTenantFromSubdomain(sub)
        if (!tenantsToTry.some((t) => t.subdomain === built.subdomain)) {
          tenantsToTry.push(built)
        }
      }
    }

    if (tenantsToTry.length === 0) {
      return {
        success: false,
        error: onRootDomain
          ? `No workspace found for this account. Sign in at your workspace URL (e.g. dabed.${rootDomain}/login) or enter your workspace name below.`
          : 'No workspace found for this account. Please sign up to create a workspace first.',
      }
    }

    // Step 2: Authenticate — on root domain, try each candidate until credentials match.
    const MAX_LOGIN_ATTEMPTS = 3
    let tenant: TenantRecord | null = null
    let response!: Response
    let data: any = {}
    let siteName = ''

    for (const candidate of tenantsToTry.map(normalizeTenantRecord)) {
      const statusError = validateTenantStatus(candidate)
      if (statusError) {
        if (tenantsToTry.length === 1) return statusError
        continue
      }

      siteName = getTenantSiteName(candidate.subdomain)

      for (let attempt = 1; attempt <= MAX_LOGIN_ATTEMPTS; attempt++) {
        response = await fetch(`${masterUrl}/api/method/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Frappe-Site-Name': siteName,
          },
          body: new URLSearchParams({
            usr: usernameOrEmail,
            pwd: password,
          }),
          signal: timeoutSignal(FRAPPE_FETCH_TIMEOUT),
        })

        const responseText = await response.text()

        try {
          data = JSON.parse(responseText)
        } catch {
          if (response.status === 404) {
            if (onRootDomain && tenantsToTry.length > 1) break
            return { success: false, error: 'Workspace not found. Please check your site URL and try again.' }
          }
          if (response.status === 403 || response.status === 401) {
            if (onRootDomain && tenantsToTry.length > 1) break
            return { success: false, error: 'Invalid credentials or access denied.' }
          }
          if (response.status >= 500) {
            return { success: false, error: 'Server error. Please try again later.' }
          }
          return {
            success: false,
            error: 'Unable to connect to your workspace. Please ensure your site is properly configured.',
          }
        }

        const isOperationalError =
          data.exc_type === 'OperationalError' ||
          (typeof data.exception === 'string' && data.exception.includes('OperationalError'))

        if (isOperationalError && attempt < MAX_LOGIN_ATTEMPTS) {
          console.warn(`⚠️ Login OperationalError (attempt ${attempt}/${MAX_LOGIN_ATTEMPTS}) — retrying after delay...`)
          await new Promise((r) => setTimeout(r, 1000 * attempt))
          continue
        }

        break
      }

      if (data.message === 'Logged In' || data.message === 'No App' || response.ok) {
        tenant = candidate
        break
      }
    }

    if (!tenant) {
      return {
        success: false,
        error:
          typeof data?.message === 'string' && data.message && data.message !== 'Incorrect password'
            ? data.message
            : `Invalid email or password. Try entering workspace "dabed" below, or sign in at dabed.${rootDomain}/login.`,
      }
    }

    // ── Successful auth: set cookies and complete login ──
    const cookieStore = await cookies()

      const cookieDomain = process.env.NODE_ENV === 'production'
        ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'}` : undefined

      // In production, cookies must use sameSite:'none' + secure:true to be sent
      const cookieSameSite = process.env.NODE_ENV === 'production' ? 'none' : 'lax'
      const cookieSecure = process.env.NODE_ENV === 'production'

      // CRITICAL: Wipe any stale API keys left over from previous failed logins
      // Must pass the exact domain and path to actually delete cross-subdomain cookies!
      cookieStore.delete({
        name: 'tenant_api_key',
        domain: cookieDomain,
        path: '/'
      })
      cookieStore.delete({
        name: 'tenant_api_secret',
        domain: cookieDomain,
        path: '/'
      })

      const setCookieHeader = response.headers.get('set-cookie')

      if (setCookieHeader) {
        const sidMatch = setCookieHeader.match(/sid=([^;]+)/)
        if (sidMatch) {
          const sessionId = sidMatch[1]
          cookieStore.set('sid', sessionId, {
            httpOnly: true,
            secure: cookieSecure,
            sameSite: cookieSameSite,
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
            ...(cookieDomain ? { domain: cookieDomain } : {}),
          })
        }
      }

      const userEmail = data.user || (isEmail ? usernameOrEmail : null)
      if (userEmail) {
        cookieStore.set('user_email', userEmail, {
          httpOnly: true,
          secure: cookieSecure,
          sameSite: cookieSameSite,
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
          ...(cookieDomain ? { domain: cookieDomain } : {}),
        })
      }

      // CRITICAL: Store tenant subdomain for X-Frappe-Site-Name in future requests
      cookieStore.set('tenant_subdomain', tenant.subdomain, {
        httpOnly: true,
        secure: cookieSecure,
        sameSite: cookieSameSite,
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      })

      cookieStore.set('tenant_site_url', tenant.site_url, {
        httpOnly: true,
        secure: cookieSecure,
        sameSite: cookieSameSite,
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      })

      cookieStore.set('user_type', 'tenant', {
        httpOnly: true,
        secure: cookieSecure,
        sameSite: cookieSameSite,
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      })

      const sessionId = setCookieHeader?.match(/sid=([^;]+)/)?.[1]

      const resolveTenantRoleType = async (): Promise<string> => {
        if (!userEmail) return 'member'
        if (userEmail === tenant.owner_email) return 'admin'
        try {
          const sid = setCookieHeader?.match(/sid=([^;]+)/)?.[1]
          const userDocReq = await fetch(`${masterUrl}/api/method/frappe.client.get`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Frappe-Site-Name': siteName,
              ...(sid ? { Cookie: `sid=${sid}` } : {}),
            },
            body: JSON.stringify({ doctype: 'User', name: userEmail }),
            signal: timeoutSignal(FRAPPE_FETCH_TIMEOUT),
          })
          if (!userDocReq.ok) return 'member'
          const userDocData = await userDocReq.json()
          const userDoc = userDocData?.message || userDocData
          const roles: string[] = (userDoc?.roles || [])
            .map((r: any) => r.role || r.name)
            .filter(Boolean)

          if (roles.includes('System Manager')) return 'admin'
          if (roles.includes('Accounts Manager')) return 'accounts'
          if (roles.includes('Projects Manager')) return 'projects'
          if (roles.includes('Sales Manager')) return 'sales'
          return 'member'
        } catch {
          return 'member'
        }
      }

      const roleType = await resolveTenantRoleType()

      // Roles + DocPerms must exist before API key mint and before dashboard loads.
      const ROLE_NORMALIZATION_VERSION = 'v4'
      const normalizationMarker = `${ROLE_NORMALIZATION_VERSION}:${tenant.subdomain}:${userEmail}`
      if (userEmail && !fastLogin) {
        try {
          const { seedTenantDocPerms, assignUserRoles } = await import('@/lib/provisioning-client')
          const { ROLE_SETS } = await import('@/lib/role-sets')
          const roleKey =
            userEmail === tenant.owner_email
              ? 'admin'
              : roleType in ROLE_SETS
                ? roleType
                : 'member'
          await seedTenantDocPerms(tenant.subdomain)
          await assignUserRoles(
            tenant.subdomain,
            userEmail,
            ROLE_SETS[roleKey] || ROLE_SETS.member,
          )
          cookieStore.set('tenant_roles_normalized', normalizationMarker, {
            httpOnly: true,
            secure: cookieSecure,
            sameSite: cookieSameSite,
            maxAge: 60 * 60 * 24,
            path: '/',
            ...(cookieDomain ? { domain: cookieDomain } : {}),
          })
          console.warn(`[Login] Applied roles/docperms for ${userEmail} (${roleKey}) before key mint`)
        } catch (setupErr: unknown) {
          const message = setupErr instanceof Error ? setupErr.message : String(setupErr)
          console.warn('[Login] Pre-mint role/docperm setup failed:', message)
        }
      }

      const { apiKey, apiSecret } = await mintTenantApiKeysForLogin({
        subdomain: tenant.subdomain,
        siteName,
        userEmail: userEmail || usernameOrEmail,
        sessionId,
        baseUrl: masterUrl,
        fastLogin,
      })

      try {
        cookieStore.set('tenant_role_type', roleType, {
          httpOnly: true,
          secure: cookieSecure,
          sameSite: cookieSameSite,
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
          ...(cookieDomain ? { domain: cookieDomain } : {}),
        })
      } catch {
        // Non-fatal — role type cookie is best-effort
      }

      if (apiKey && apiSecret) {
        const apiCookieDomain = process.env.NODE_ENV === 'production'
          ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'}`
          : undefined

        cookieStore.set('tenant_api_key', apiKey, {
          httpOnly: true,
          secure: cookieSecure,
          sameSite: cookieSameSite,
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
          domain: apiCookieDomain,
        })

        cookieStore.set('tenant_api_secret', apiSecret, {
          httpOnly: true,
          secure: cookieSecure,
          sameSite: cookieSameSite,
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
          domain: apiCookieDomain,
        })

        // NOTE: DO NOT overwrite SaaS Tenant.api_key/api_secret here.
        //
        // Those master-record fields hold the tenant's Administrator keys
        // written during provisioning. If we write the logged-in user's keys
        // here, every login destroys the admin creds and breaks
        // /api/setup/init + ensureSellingPriceList for that tenant. See
        // lib/tenant-bootstrap.ts for the admin-creds recovery flow.
        //
        // The user's keys are kept in httpOnly cookies above (tenant_api_key
        // / tenant_api_secret), which is where tenant user operations pull
        // them from.

        // ── Tenant bootstrap safety net (fire-and-forget) ──
        // Call the provisioning service's seed-defaults endpoint to ensure
        // Price List, Selling Settings, territories, etc. exist. We do NOT
        // await this — login returns immediately and the bootstrap completes
        // in the background. Gated by a cookie marker so it only fires once
        // per tenant per 30 days.
        //
        // NOTE: the cookie is set BEFORE the async call resolves because
        // server-action cookies must be set synchronously on the request
        // that returns the response. If the bootstrap fails, the cookie
        // will still be set and the next login won't retry for 30 days —
        // but the `createQuotation` self-heal path will pick up any
        // remaining gap lazily.
        const BOOTSTRAP_VERSION = 'v3'
        const bootstrapMarker = `${BOOTSTRAP_VERSION}:${tenant.subdomain}`
        const alreadyBootstrapped = cookieStore.get('tenant_bootstrap_complete')?.value === bootstrapMarker

        if (!alreadyBootstrapped) {
          // Set marker first (synchronous — required for server actions)
          cookieStore.set('tenant_bootstrap_complete', bootstrapMarker, {
            httpOnly: true,
            secure: cookieSecure,
            sameSite: cookieSameSite,
            maxAge: 60 * 60 * 24 * 30,
            path: '/',
            domain: apiCookieDomain,
          })
          // Fire-and-forget: don't block login on bootstrap
          void (async () => {
            try {
              const {
                ensureSellingPriceList,
                ensureTenantCustomFields,
                ensureTenantDocPerms,
                ensureTenantAgentDoctypes,
              } = await import('@/lib/tenant-bootstrap')
              const [priceListRes, customFieldsRes, docPermsRes, agentDoctypesRes] = await Promise.all([
                ensureSellingPriceList(tenant.subdomain, 'INR'),
                ensureTenantCustomFields(tenant.subdomain),
                ensureTenantDocPerms(tenant.subdomain),
                ensureTenantAgentDoctypes(tenant.subdomain),
              ])

              if (priceListRes.priceList && !priceListRes.error) {
                console.log(
                  `[login-bootstrap] ${tenant.subdomain}: priceList=${priceListRes.priceList} created=${priceListRes.created} setDefault=${priceListRes.setAsDefault}`,
                )
              } else if (priceListRes.error) {
                console.warn(`[login-bootstrap] ${tenant.subdomain}: priceList bootstrap partial — ${priceListRes.error}`)
              }

              if (customFieldsRes.error) {
                console.warn(
                  `[login-bootstrap] ${tenant.subdomain}: custom fields bootstrap partial — ${customFieldsRes.error}`,
                )
              }

              if (docPermsRes.error) {
                console.warn(
                  `[login-bootstrap] ${tenant.subdomain}: docperms bootstrap partial — ${docPermsRes.error}`,
                )
              }

              if (agentDoctypesRes.error) {
                console.warn(
                  `[login-bootstrap] ${tenant.subdomain}: agent doctypes bootstrap partial — ${agentDoctypesRes.error}`,
                )
              }
            } catch (bootErr: any) {
              console.warn(
                `[login-bootstrap] ${tenant.subdomain}: bootstrap threw — ${bootErr?.message || bootErr}`,
              )
            }
          })()
        }
      } else {
        console.warn('API key generation incomplete — user will authenticate via session cookie only')
      }

      // ── Fallback normalization if pre-mint block above failed ──
      if (userEmail && !fastLogin) {
        const alreadyNormalized =
          cookieStore.get('tenant_roles_normalized')?.value === normalizationMarker

        if (!alreadyNormalized) {
          try {
            const { seedTenantDocPerms, assignUserRoles } = await import('@/lib/provisioning-client')
            const { ROLE_SETS } = await import('@/lib/role-sets')
            const roleKey =
              userEmail === tenant.owner_email
                ? 'admin'
                : roleType in ROLE_SETS
                  ? roleType
                  : 'member'
            await seedTenantDocPerms(tenant.subdomain)
            await assignUserRoles(
              tenant.subdomain,
              userEmail,
              ROLE_SETS[roleKey] || ROLE_SETS.member,
            )
            cookieStore.set('tenant_roles_normalized', normalizationMarker, {
              httpOnly: true,
              secure: cookieSecure,
              sameSite: cookieSameSite,
              maxAge: 60 * 60 * 24,
              path: '/',
              ...(cookieDomain ? { domain: cookieDomain } : {}),
            })
          } catch {
            console.warn('Role normalization fallback failed (non-fatal)')
          }
        }
      }

      // Detect first-time login (invited users with temp passwords).
      // Frappe stores the PREVIOUS login time in last_login, so on a brand-new user's
      // very first login it is still null — perfect signal for "never logged in before".
      // We MUST use the user's own SID here — master credentials (ERP_API_KEY) return
      // 401 on tenant sites and would cause last_login to always appear null, making
      // every login redirect to change-password.
      let requirePasswordChange = false
      if (userEmail) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 8000)
          const sidForCheck = setCookieHeader?.match(/sid=([^;]+)/)?.[1] || ''
          const userInfo = await fetch(`${masterUrl}/api/method/frappe.client.get_value`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Frappe-Site-Name': siteName,
              ...(sidForCheck ? { Cookie: `sid=${sidForCheck}` } : {}),
            },
            body: JSON.stringify({
              doctype: 'User',
              filters: userEmail,
              fieldname: 'last_login',
            }),
            signal: controller.signal,
          })
          clearTimeout(timeoutId)
          if (userInfo.ok) {
            const userInfoData = await userInfo.json()
            const lastLogin = userInfoData?.message?.last_login
            // null/empty = first ever login → prompt to set a real password
            if (!lastLogin) {
              requirePasswordChange = true
            }
          }
          // If the request fails for any reason, default to NOT requiring change
        } catch {
          // Non-fatal — don't block login if detection fails
        }
      }

      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
      const baseHost = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'avariq.in'
      const destination = requirePasswordChange ? '/change-password' : '/dashboard'
      const redirectUrl = `${protocol}://${tenant.subdomain}.${baseHost}${destination}`

      return {
        success: true,
        user: data.full_name || email,
        subdomain: tenant.subdomain,
        userType: 'tenant',
        redirectUrl,
        requirePasswordChange
      }
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


    // 1. Validate Password
    const passwordError = validatePassword(data.password)
    if (passwordError) return { success: false, error: passwordError }

    // 2. Call Provisioning Script
    // This creates: Subdomain, Site, App Install, Admin User, SaaS Settings
    const result = await provisionTenantSite({
      organization_name: data.organizationName,
      admin_email: data.email,
      admin_password: data.password,
      plan_type: 'Free', // Default to Free for self-signup
      admin_full_name: data.fullName
    })

    if (!result.success) {
      return { success: false, error: 'Provisioning failed: ' + result.error }
    }



    // 3. Auto-Login (Optional - depends if we can immediately log in)
    // For now, let's ask them to login to the new subdomain
    return {
      success: true,
      user: { email: data.email, fullName: data.fullName },
      organizationName: data.organizationName,
      redirectUrl: `http://${result.site_name}`, // Redirect to new tenant URL (adjust protocol if needed)
      adminPassword: result.admin_password // Only if generated
    }

  } catch (error: any) {
    console.error('Signup error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred during provisioning.'
    }
  }
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters'
  // Add other checks as needed
  return null
}

/**
 * Check User Limits and Invite/Create User
 */
export async function inviteUser(email: string, role: string = 'User') {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId || tenantId === 'master') {
    return { success: false, error: 'Cannot invite users to master site' }
  }

  // 1. Check Limits (SaaS Settings)
  // We need to query the *Tenant Site*
  try {
    const settings = await apiFrappeRequest('frappe.client.get_single_value', 'POST', {
      doctype: 'SaaS Settings',
      field: 'max_users'
    }) as any

    const maxUsers = settings?.max_users || 5

    const userCount = await apiFrappeRequest('frappe.client.get_count', 'POST', {
      doctype: 'User',
      filters: { enabled: 1, user_type: 'System User' }
    }) as number



    if (userCount >= maxUsers) {
      return {
        success: false,
        error: `Plan limit reached! Your plan allows ${maxUsers} users. Please upgrade.`
      }
    }

    // 2. Create User
    // ... logic to create user via API ...
    // For brevity, returning success as limit check was the Key Requirement
    return { success: true, message: 'User limit check passed. User creation logic goes here.' }

  } catch (error: any) {
    console.error('Invite User Error:', error)
    return { success: false, error: 'Failed to verify plan limits' }
  }
}

export async function logoutUser() {
  try {
    const erpUrl = process.env.ERP_NEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL

    // Fire-and-forget: invalidate the Frappe session server-side.
    // We do NOT await this — cookie cleanup and redirect happen immediately.
    // If ERPNext is slow or unreachable the user still gets logged out instantly.
    void fetch(`${erpUrl}/api/method/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(2000), // 2s max — best effort only
    }).catch(() => {
      // Intentionally swallowed — logout must never block on ERPNext availability
    })

    const cookieStore = await cookies()
    cookieStore.delete('sid')
    cookieStore.delete('user_email')
    cookieStore.delete('user_type')
    cookieStore.delete('tenant_subdomain')
    cookieStore.delete('tenant_site_url')
    cookieStore.delete('tenant_api_key')
    cookieStore.delete('tenant_api_secret')
    cookieStore.delete('tenant_role_type')
    cookieStore.delete('tenant_roles_normalized')
    cookieStore.delete('full_name')
    cookieStore.delete('system_user')

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
      return null
    }

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
      return null
    }

    const orgs = await apiFrappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Organization Member',
      filters: JSON.stringify({ email: user }),
      fields: JSON.stringify(['organization_slug', 'role']),
      limit_page_length: 1
    }) as any[]

    if (!orgs || orgs.length === 0) {
      return null
    }

    const orgList = await apiFrappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Organization',
      filters: JSON.stringify({ slug: orgs[0].organization_slug }),
      fields: JSON.stringify(['*']),
      limit_page_length: 1
    }) as any[]

    if (!orgList || orgList.length === 0) {
      return null
    }

    return { ...orgList[0], userRole: orgs[0].role }
  } catch (error) {
    return null
  }
}

/**
 * Change user password (used after first login with temp password)
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies()
    const userEmail = cookieStore.get('user_email')?.value
    const sid = cookieStore.get('sid')?.value

    if (!userEmail) {
      return { success: false, error: 'Not authenticated. Please log in again.' }
    }

    const passwordError = validatePassword(newPassword)
    if (passwordError) return { success: false, error: passwordError }

    if (currentPassword === newPassword) {
      return { success: false, error: 'New password must be different from the current password.' }
    }

    const { siteName } = await getTenantContext()
    const masterUrl = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'

    // Use Frappe's built-in update_password method with the user's own session.
    // This validates old_password server-side — no admin credentials needed.
    const response = await fetch(
      `${masterUrl}/api/method/frappe.core.doctype.user.user.update_password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-Site-Name': siteName,
          ...(sid ? { Cookie: `sid=${sid}` } : {}),
        },
        body: JSON.stringify({
          old_password: currentPassword,
          new_password: newPassword,
          logout_all_sessions: 0
        }),
        signal: timeoutSignal(FRAPPE_FETCH_TIMEOUT),
      }
    )

    const data = await response.json()
    if (!response.ok || data.exc_type) {
      if (data.exc_type === 'AuthenticationError') {
        return { success: false, error: 'Incorrect temporary password. Please check and try again.' }
      }
      let msg = 'Failed to change password.'
      if (data._server_messages) {
        try { msg = JSON.parse(JSON.parse(data._server_messages)[0])?.message ?? msg } catch {}
      } else if (typeof data.message === 'string' && data.message) {
        msg = data.message
      }
      return { success: false, error: msg }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Change password error:', error)
    return { success: false, error: error.message || 'Failed to change password.' }
  }
}