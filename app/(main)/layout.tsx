import { AppSidebar } from "@/components/app-sidebar"
import { TenantGuard } from "@/components/auth/tenant-guard";
import { FloatingAIChatLazy } from "@/components/ai/floating-chat-lazy";
import { MainDataProviders } from "@/components/main-data-providers";
import { RouteTransitionIndicator } from "@/components/route-transition-indicator";
import { getUserProfile } from "@/app/actions/profile"
import { ensureTenantApiCredentials } from "@/lib/ensure-tenant-api-credentials"
import { getUserRoles, requireAuth } from "@/lib/auth-guard"
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
  await ensureTenantApiCredentials()

  const [initialRoles, initialProfile] = await Promise.all([
    getUserRoles(),
    getUserProfile(),
  ])
  
  const cookieStore = await cookies()
  const hasServerAuth =
    cookieStore.has('tenant_api_key') ||
    cookieStore.has('sid') ||
    cookieStore.has('user_email') ||
    cookieStore.has('next-auth.session-token') ||
    cookieStore.has('__Secure-next-auth.session-token')

  return (
    <MainDataProviders initialRoles={initialRoles} initialProfile={initialProfile}>
      <div className="flex h-dvh overflow-hidden bg-background text-foreground">
        <RouteTransitionIndicator />
        <AppSidebar />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          <TenantGuard hasServerAuth={hasServerAuth}>
            {children}
          </TenantGuard>
        </main>
        {/* FloatingAIChat must be outside <main> — overflow-x-hidden on main clips
            position:fixed children in Chromium, making the button invisible. */}
        <FloatingAIChatLazy />
      </div>
    </MainDataProviders>
  )
}
