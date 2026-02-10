import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

/**
 * NextAuth Configuration for Nexus ERP Multi-Tenant SaaS
 * =======================================================
 * 
 * AUTH FLOW:
 * 
 * [Google OAuth]
 *   1. User clicks "Sign in with Google"
 *   2. Google returns { email, name, image }
 *   3. signIn callback fires:
 *      - Calls Master DB to check if email owns a tenant
 *      - YES → sets hasTenant=true, tenantSubdomain in token
 *      - NO  → sets hasTenant=false (user needs onboarding)
 *   4. redirect callback sends user to correct location:
 *      - Has tenant → `subdomain.avariq.in/dashboard`
 *      - No tenant  → `/onboarding` (to create workspace)
 * 
 * COOKIE STRATEGY:
 *   Session cookie domain is `.avariq.in` (production) so it works
 *   across all tenant subdomains. User authenticates once on avariq.in,
 *   and the session is valid on tesla.avariq.in, spacex.avariq.in, etc.
 */

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const MASTER_SITE = process.env.FRAPPE_SITE_NAME || 'erp.localhost'
const ERP_URL = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'

// ── Providers ──
const providers: any[] = []
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    })
  )
}

// ── Helper: Lookup tenant by email in Master DB ──
async function lookupTenantInMasterDB(email: string): Promise<{
  hasTenant: boolean
  subdomain?: string
}> {
  try {
    const apiKey = process.env.ERP_API_KEY
    const apiSecret = process.env.ERP_API_SECRET
    if (!apiKey || !apiSecret) return { hasTenant: false }

    const params = new URLSearchParams({
      doctype: 'SaaS Tenant',
      filters: JSON.stringify({ owner_email: email, status: 'Active' }),
      fields: JSON.stringify(['subdomain']),
      limit_page_length: '1',
    })

    const response = await fetch(
      `${ERP_URL}/api/method/frappe.client.get_list?${params}`,
      {
        headers: {
          'Authorization': `token ${apiKey}:${apiSecret}`,
          'X-Frappe-Site-Name': MASTER_SITE,
        },
        // No cache — always check fresh
        cache: 'no-store',
      }
    )

    if (!response.ok) return { hasTenant: false }

    const data = await response.json()
    const tenants = data.message || data.data || []

    if (tenants.length > 0) {
      return { hasTenant: true, subdomain: tenants[0].subdomain }
    }
    return { hasTenant: false }
  } catch (error) {
    console.error('[Auth] Master DB tenant lookup failed:', error)
    return { hasTenant: false }
  }
}

// ── Callbacks ──
const callbacks = {
  async signIn({ user }: any) {
    if (!user.email) return false
    // Allow all Google sign-ins — routing happens in redirect callback
    return true
  },

  async jwt({ token, user, trigger, session }: any) {
    // On initial sign-in, look up tenant in Master DB
    if (user) {
      token.email = user.email
      token.name = user.name
      token.picture = user.image

      const lookup = await lookupTenantInMasterDB(user.email)
      token.hasTenant = lookup.hasTenant
      token.tenantSubdomain = lookup.subdomain || null
    }

    // Allow manual updates (e.g., after provisioning completes)
    if (trigger === 'update' && session) {
      if (session.hasTenant !== undefined) token.hasTenant = session.hasTenant
      if (session.tenantSubdomain) token.tenantSubdomain = session.tenantSubdomain
    }

    return token
  },

  async session({ session, token }: any) {
    if (session.user) {
      session.user.email = token.email as string
      session.user.name = token.name as string
      session.user.image = token.picture as string
    }
    // Attach tenant info to session (accessible client-side)
    session.hasTenant = token.hasTenant as boolean
    session.tenantSubdomain = token.tenantSubdomain as string | null
    return session
  },

  async redirect({ url, baseUrl }: any) {
    // Allow redirects to same-domain subdomains
    if (url.startsWith('/')) return `${baseUrl}${url}`

    try {
      const urlObj = new URL(url)
      if (urlObj.hostname.endsWith(ROOT_DOMAIN) || urlObj.hostname.includes('localhost')) {
        return url
      }
    } catch {
      // Invalid URL, fall through to baseUrl
    }

    return baseUrl
  },
}

// ── Cookie Configuration for Cross-Subdomain Auth ──
const useSecureCookies = IS_PRODUCTION
const cookiePrefix = useSecureCookies ? '__Secure-' : ''

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  callbacks,
  pages: {
    signIn: '/login',
    error: '/login',
  },
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        // CRITICAL: Dot-prefix domain allows cookie to work on ALL subdomains
        // e.g., `.avariq.in` → valid on tesla.avariq.in, spacex.avariq.in, etc.
        domain: useSecureCookies ? `.${ROOT_DOMAIN}` : undefined,
      },
    },
  },
} as any)
