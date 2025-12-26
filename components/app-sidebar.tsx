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
  Calendar,
  Settings,
  Menu,
  ClipboardCheck,
  TrendingUp,
  Receipt,
  Wallet,
  Package,
  Percent,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from '@/components/theme-toggle'
import { useState } from 'react'

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { name: 'Leads', icon: Users, href: '/crm' },
  { name: 'Opportunities', icon: TrendingUp, href: '/crm/opportunities' },
  { name: 'Quotations', icon: Receipt, href: '/quotations' },
  { name: 'Sales Orders', icon: Package, href: '/sales-orders' },
  { name: 'Invoices', icon: FileText, href: '/invoices' },
  { name: 'Payments', icon: Wallet, href: '/payments' },
  { name: 'Catalogue', icon: Package, href: '/catalogue' },
  { name: 'Pricing Rules', icon: Percent, href: '/pricing-rules' },
  { name: 'Projects', icon: FolderKanban, href: '/projects' },
  { name: 'Bookings', icon: Calendar, href: '/bookings' },
  { name: 'Inspections', icon: ClipboardCheck, href: '/inspections' },
  { name: 'Operators', icon: Users, href: '/operators' },
  { name: 'Settings', icon: Settings, href: '/settings' },
]

// 1. Reusable Sidebar Content
function SidebarContent({ isCollapsed = false, onToggle }: { isCollapsed?: boolean; onToggle?: () => void }) {
  const pathname = usePathname()
  
  return (
    <div 
      suppressHydrationWarning
      className="flex h-full flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50"
    >
      {/* Logo Area */}
      <div suppressHydrationWarning className="flex h-14 items-center border-b border-slate-200/50 dark:border-slate-800/50 px-6 shrink-0 justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
            <div suppressHydrationWarning className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            {!isCollapsed && <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Nexus</span>}
        </Link>
        {onToggle && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggle}
            className="h-7 w-7 hidden md:flex"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Navigation Links */}
      <div suppressHydrationWarning className="flex-1 overflow-auto py-4">
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
                  } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.name : ''}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Footer Links */}
      <div suppressHydrationWarning className="border-t p-4 space-y-3 shrink-0">
        {!isCollapsed ? (
          <>
            <div className="flex items-center justify-between px-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Theme</span>
              <ThemeToggle />
            </div>
            
            <a 
                href={`${process.env.NEXT_PUBLIC_ERP_NEXT_URL || 'http://103.224.243.242:8080'}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors"
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
          </>
        ) : (
          <div className="flex flex-col gap-2 items-center">
            <ThemeToggle />
            <a 
                href={`${process.env.NEXT_PUBLIC_ERP_NEXT_URL || 'http://103.224.243.242:8080'}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors"
                title="Classic ERP"
            >
                <ExternalLink className="h-4 w-4" />
            </a>
            <Button variant="outline" size="icon" asChild>
              <Link href="/login" title="Sign Out">
                <LogOut className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// 2. Main Responsive Component
export function AppSidebar() {
  const [open, setOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <>
      {/* Mobile Sidebar (Drawer) */}
      <div suppressHydrationWarning className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-white/80 backdrop-blur-sm shadow-sm border-slate-200 dark:bg-slate-900/80 dark:border-slate-800">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
             <div className="h-full" onClick={() => setOpen(false)}>
                <SidebarContent />
             </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar (Fixed with collapse) */}
      <div 
        suppressHydrationWarning
        className={`hidden md:flex h-screen flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 transition-all duration-300 ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <SidebarContent isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      </div>
    </>
  )
}
