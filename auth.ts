import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

// Only include Google provider if credentials are available
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
                    response_type: "code"
                }
            }
        })
    )
}

const callbacks = {
    async signIn({ user, account, profile }: any) {
        if (!user.email) return false
        // 1. Check if user exists in Master DB (Optional but good practice)
        // For now, we allow Google Sign-in to pass, but the logic in user-auth.ts 
        // or the client-side will handle "New User" vs "Existing User" redirection.
        return true
    },
    async jwt({ token, user, trigger, session }: any) {
        if (user) {
            token.email = user.email
            token.hasTenant = false
        }

        if (trigger === "update" && session?.hasTenant) {
            token.hasTenant = true
            token.tenantSubdomain = session.tenantSubdomain
        }
        return token
    },
    async session({ session, token }: any) {
        if (session.user) {
            session.user.email = token.email as string
            // @ts-ignore
            session.hasTenant = token.hasTenant as boolean
            // @ts-ignore
            session.tenantSubdomain = token.tenantSubdomain as string
        }
        return session
    },
    async redirect({ url, baseUrl }: any) {
        // Allow redirects to subdomains
        if (url.startsWith("/")) return `${baseUrl}${url}`
        else if (new URL(url).hostname.endsWith(process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in')) return url
        return baseUrl
    }
}

// CRITICAL: Set Cookie Domain for Cross-Subdomain Auth
const useSecureCookies = process.env.NODE_ENV === 'production'
const cookiePrefix = useSecureCookies ? '__Secure-' : ''
const hostName = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers,
    callbacks,
    pages: {
        signIn: '/login',
        error: '/login'
    },
    cookies: {
        sessionToken: {
            name: `${cookiePrefix}next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: useSecureCookies,
                domain: useSecureCookies ? `.${hostName}` : undefined // localhost doesn't support dot prefix well usually
            }
        }
    }
} as any)
