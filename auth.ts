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
        // Just return true here - Frappe validation happens in server actions
        return true
    },
    async jwt({ token, user, trigger, session }: any) {
        if (user) {
            token.email = user.email
            token.hasTenant = false  // Default - will be set by session callback or server actions
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
        return baseUrl + "/dashboard"
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers,
    callbacks,
    pages: {
        signIn: '/login',
        error: '/login'
    }
} as any)
