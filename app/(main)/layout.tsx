import { AppSidebar } from "@/components/app-sidebar"
import { TenantGuard } from "@/components/auth/tenant-guard";
import { FloatingAIChat } from "@/components/ai/floating-chat";
import { requireAuth } from "@/lib/auth-guard"
import { cookies } from "next/headers"

/**
 * Main Application Layout
 * 
 * Server-side authentication is enforced at the layout level.
 * This ensures ALL routes under (main)/* are protected.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side authentication check
  // Will redirect to login if user is not authenticated
  await requireAuth()
  
  const cookieStore = await cookies()
  const hasServerAuth =
    cookieStore.has('tenant_api_key') ||
    cookieStore.has('sid') ||
    cookieStore.has('user_email') ||
    cookieStore.has('next-auth.session-token') ||
    cookieStore.has('__Secure-next-auth.session-token')

  return (
    <div className="app-shell flex overflow-hidden">
      <AppSidebar />
      <main className="flex-1 min-w-0 min-h-screen">
        <TenantGuard hasServerAuth={hasServerAuth}>
          {children}
          <FloatingAIChat />
        </TenantGuard>
      </main>
    </div>
  )
}
