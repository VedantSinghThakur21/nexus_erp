import { AppSidebar } from "@/components/app-sidebar"
import { TenantGuard } from "@/components/auth/tenant-guard";

import { cookies } from "next/headers"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const hasApiKey = cookieStore.has('tenant_api_key')

  return (
    <div className="flex min-h-screen overflow-hidden bg-[#F3F4F6]">
      <AppSidebar />

      {/* Main content area with left margin for fixed sidebar */}
      <main className="ml-64 flex-1 min-h-screen">
        <TenantGuard hasApiKey={hasApiKey}>
          {children}
        </TenantGuard>
      </main>
    </div>
  )
}

