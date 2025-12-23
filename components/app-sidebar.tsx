'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Bot, 
  ExternalLink, 
  LogOut, 
  FolderKanban, 
  Truck, 
  Calendar,
  Settings,
  Menu,
  ClipboardCheck,
  TrendingUp,
  Receipt
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from 'react'

const menuItems = [
  { name: 'Workspace', icon: LayoutDashboard, href: '/dashboard' },
  { name: 'CRM & Leads', icon: Users, href: '/crm' },
  { name: 'Opportunities', icon: TrendingUp, href: '/crm/opportunities' },
  { name: 'Quotations', icon: Receipt, href: '/crm/quotations' },
  { name: 'Invoices', icon: FileText, href: '/invoices' },
  { name: 'Projects', icon: FolderKanban, href: '/projects' },
  { name: 'Fleet', icon: Truck, href: '/fleet' },
  { name: 'Bookings', icon: Calendar, href: '/bookings' },
  { name: 'Inspections', icon: ClipboardCheck, href: '/inspections' },
  { name: 'AI Agents', icon: Bot, href: '/agents' },
  { name: 'Settings', icon: Settings, href: '/settings' },
]

// 1. Reusable Sidebar Content
function SidebarContent() {
  const pathname = usePathname()
  
  return (
    <div 
      className="flex h-full flex-col bg-slate-50/50 dark:bg-slate-900/50"
      suppressHydrationWarning // FIX: Ignore Dark Reader attributes here
    >
      {/* Logo Area */}
      <div className="flex h-14 items-center border-b px-6 shrink-0" suppressHydrationWarning>
        <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center" suppressHydrationWarning>
              <span className="text-white font-bold text-xs">N</span>
            </div>
            <span className="text-lg font-bold text-slate-800 dark:text-slate-100">Nexus</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-auto py-4" suppressHydrationWarning>
        <nav className="grid gap-1 px-2">
          {menuItems.map((item, index) => {
            // More precise matching: exact match or starts with href followed by a slash
            // Special case for /crm to avoid matching /crm/opportunities and /crm/quotations
            const isActive = pathname === item.href || 
              (item.href !== '/crm' && pathname.startsWith(item.href + '/'))
            return (
              <Link
                key={index}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors 
                  ${isActive 
                    ? 'bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900' 
                    : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50'
                  }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer Links */}
      <div className="border-t p-4 space-y-2 shrink-0" suppressHydrationWarning>
        <a 
            href={`${process.env.NEXT_PUBLIC_ERP_NEXT_URL || 'http://103.224.243.242:8080'}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
        >
            <ExternalLink className="h-4 w-4" />
            Classic ERP
        </a>

        <Button variant="outline" className="w-full gap-2 justify-start" asChild>
          <Link href="/login">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Link>
        </Button>
      </div>
    </div>
  )
}

// 2. Main Responsive Component
export function AppSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile Sidebar (Drawer) */}
      <div className="md:hidden fixed top-4 left-4 z-50" suppressHydrationWarning>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-white/80 backdrop-blur-sm shadow-sm border-slate-200 dark:bg-slate-900/80 dark:border-slate-800" suppressHydrationWarning>
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72" suppressHydrationWarning>
             <div className="h-full" onClick={() => setOpen(false)}>
                <SidebarContent />
             </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar (Fixed) */}
      <div 
        className="hidden md:flex h-screen w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
        suppressHydrationWarning // FIX: Ignore Dark Reader attributes here too
      >
        <SidebarContent />
      </div>
    </>
  )
}