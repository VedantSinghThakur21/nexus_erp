import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div 
      suppressHydrationWarning
      className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
    >
      <AppSidebar />
      
      <main className="flex-1 overflow-y-auto">
        <div className="fixed top-6 right-6 z-50">
          <ThemeToggle />
        </div>
        {children}
      </main>
    </div>
  )
}

