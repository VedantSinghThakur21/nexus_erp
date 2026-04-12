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
    <div className="flex min-h-screen overflow-hidden bg-[#F3F4F6]">
      <AppSidebar />

      {/* Main content area with left margin for fixed sidebar */}
      <main className="ml-64 flex-1 min-h-screen">
        <TenantGuard hasServerAuth={hasServerAuth}>
          {children}
          <FloatingAIChat />
        </TenantGuard>
      </main>
    </div>
  )
}
