import { AppSidebar } from "@/components/app-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // FIX: Added suppressHydrationWarning to ignore browser extension attributes
    <div 
      className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950"
      suppressHydrationWarning
    >
      <AppSidebar />
      
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
