import { AppSidebar } from '@/components/app-sidebar'
import { TenantGuard } from '@/components/auth/tenant-guard'
import { MainDataProviders } from '@/components/main-data-providers'
import { RouteTransitionIndicator } from '@/components/route-transition-indicator'
import { getUserProfile } from '@/app/actions/profile'
import { getUserRoles, requireAuth } from '@/lib/auth-guard'
import { cookies } from 'next/headers'
import { FloatingAIChat } from '@/components/ai/floating-chat'

/**
 * Tenant app layout — mirrors the existing app/(main)/layout.tsx
 * Server-side authentication is enforced at the layout level.
 */
export default async function TenantAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side authentication check
  await requireAuth()

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
        {/* Mirror app/(main)/layout.tsx: keep FloatingAIChat outside <main>
            so fixed positioning is not clipped by overflow settings. */}
        <FloatingAIChat />
      </div>
    </MainDataProviders>
  )
}
