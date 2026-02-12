import { AppSidebar } from '@/components/app-sidebar'
import { TenantGuard } from '@/components/auth/tenant-guard'
import { cookies } from 'next/headers'

/**
 * Tenant app layout — mirrors the existing app/(main)/layout.tsx
 * Includes sidebar navigation and tenant credential guard.
 */
export default async function TenantAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const hasApiKey = cookieStore.has('tenant_api_key')

  return (
    <div className="flex min-h-screen overflow-hidden bg-[#F3F4F6]">
      <AppSidebar />
      <main className="ml-64 flex-1 min-h-screen">
        <TenantGuard hasApiKey={hasApiKey}>
          {children}
        </TenantGuard>
      </main>
    </div>
  )
}
