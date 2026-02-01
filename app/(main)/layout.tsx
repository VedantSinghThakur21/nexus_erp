import { AppSidebar } from "@/components/app-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div 
      suppressHydrationWarning
      className="flex min-h-screen overflow-hidden bg-gray-50"
    >
      <AppSidebar />
      
      <main className="flex-1 max-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

