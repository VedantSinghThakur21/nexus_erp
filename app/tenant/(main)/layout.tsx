import { AppSidebar } from '@/components/app-sidebar'
import { TenantGuard } from '@/components/auth/tenant-guard'
import { requireAuth } from '@/lib/auth-guard'
import { cookies } from 'next/headers'

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
      <main className="ml-64 flex-1 min-h-screen">
        <TenantGuard hasServerAuth={hasServerAuth}>
          {children}
        </TenantGuard>
      </main>
    </div>
  )
}
