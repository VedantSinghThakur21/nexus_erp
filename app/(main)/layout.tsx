import { AppSidebar } from "@/components/app-sidebar"
import { TenantGuard } from "@/components/auth/tenant-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen overflow-hidden bg-[#F3F4F6]">
      <AppSidebar />

      {/* Main content area with left margin for fixed sidebar */}
      <main className="ml-64 flex-1 min-h-screen">
        <TenantGuard>
          {children}
        </TenantGuard>
      </main>
    </div>
  )
}

