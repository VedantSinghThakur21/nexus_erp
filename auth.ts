import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { frappeRequest } from "@/app/lib/api"

// Only include Google provider if credentials are available
const providers = []
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

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers,
    callbacks: {
        async signIn({ user, account, profile }) {
            if (!user.email) return false

            try {
                // 1. Check if user exists in Master DB
                const existingUsers = await frappeRequest(
                    'frappe.client.get_list', 'GET', {
                    doctype: 'User',
                    filters: JSON.stringify({ email: user.email }),
                    fields: JSON.stringify(['name', 'email']),
                    limit_page_length: 1
                },
                    { useMasterCredentials: true }
                ) as any[]

                if (existingUsers && existingUsers.length > 0) {
                    // User exists - allow login
                    return true
                } else {
                    // User doesn't exist - allow login but redirect to onboarding
                    // We can't redirect here directly in all NextAuth versions comfortably, 
                    // but we can flag it in the session/jwt.
                    return true
                }
            } catch (error) {
                console.error("SignIn Callback Error:", error)
                return false // Deny sign in on error
            }
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                // Initial sign in
                token.email = user.email

                // Check for Tenant
                try {
                    // We use a Master Request to find the tenant
                    // This is similar to `findTenantForEmail` in `user-auth.ts`
                    const tenants = await frappeRequest(
                        'frappe.client.get_list', 'GET', {
                        doctype: 'SaaS Tenant',
                        filters: JSON.stringify({ owner_email: user.email }),
                        fields: JSON.stringify(['subdomain', 'status']),
                        limit_page_length: 1
                    },
                        { useMasterCredentials: true }
                    ) as any[]

                    if (tenants && tenants.length > 0) {
                        token.tenantSubdomain = tenants[0].subdomain
                        token.hasTenant = true
                    } else {
                        token.hasTenant = false
                    }
                } catch (e) {
                    console.error("JWT Callback Tenant Lookup Error", e)
                }
            }

            // Update session if onboarding completed
            if (trigger === "update" && session?.hasTenant) {
                token.hasTenant = true
                token.tenantSubdomain = session.tenantSubdomain
            }

            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.email = token.email as string
                // @ts-ignore
                session.hasTenant = token.hasTenant as boolean
                // @ts-ignore
                session.tenantSubdomain = token.tenantSubdomain as string
            }
            return session
        },
        async redirect({ url, baseUrl }) {
            // Logic to redirect after signin
            // If we could detect "New User" via a cookie or param, we'd go to /onboarding
            // For now, client-side will handle "if (!session.hasTenant) router.push('/onboarding')"
            return baseUrl + "/dashboard"
        }
    },
    pages: {
        signIn: '/login', // Custom login page
        error: '/login' // Error page
    }
})
