import { AppSidebar } from "@/components/app-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div 
      suppressHydrationWarning
      className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950"
    >
      <AppSidebar />
      
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

