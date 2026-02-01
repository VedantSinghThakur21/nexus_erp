'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
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
  UserCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from 'react'
import { logoutUser as logoutUserAuth } from '@/app/actions/user-auth'
import { logoutUser as logoutUserAction } from '@/app/actions/logout'

// Organized menu structure by category
const menuStructure = [
  {
    category: 'MAIN',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    ]
  },
  {
    category: 'CRM',
    items: [
      { name: 'Leads', icon: Users, href: '/crm' },
      { name: 'Opportunities', icon: TrendingUp, href: '/crm/opportunities' },
    ]
  },
  {
    category: 'SALES',
    items: [
      { name: 'Quotations', icon: Receipt, href: '/quotations' },
      { name: 'Sales Orders', icon: Package, href: '/sales-orders' },
      { name: 'Invoices', icon: FileText, href: '/invoices' },
      { name: 'Payments', icon: Wallet, href: '/payments' },
    ]
  },
  {
    category: 'INVENTORY',
    items: [
      { name: 'Catalogue', icon: Package, href: '/catalogue' },
      { name: 'Pricing Rules', icon: Percent, href: '/pricing-rules' },
    ]
  },
  {
    category: 'OPERATIONS',
    items: [
      { name: 'Projects', icon: FolderKanban, href: '/projects' },
      { name: 'Bookings', icon: Calendar, href: '/bookings' },
      { name: 'Inspections', icon: ClipboardCheck, href: '/inspections' },
      { name: 'Operators', icon: UserCircle, href: '/operators' },
    ]
  },
  {
    category: 'ADMIN',
    items: [
      { name: 'Team', icon: Users, href: '/team' },
      { name: 'Settings', icon: Settings, href: '/settings' },
    ]
  }
]

// 1. Reusable Sidebar Content
function SidebarContent() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    try {
      await logoutUserAction()
    } catch (error) {
      console.error('Logout error:', error)
      await logoutUserAuth()
      router.push('/login')
      router.refresh()
    }
  }
  
  return (
    <div 
      suppressHydrationWarning
      className="flex h-full flex-col bg-[#1a1c1e] text-gray-100"
    >
      {/* Logo Area */}
      <div suppressHydrationWarning className="flex h-16 items-center px-6 shrink-0 border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div suppressHydrationWarning className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 via-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
            <span className="text-black font-bold text-base">A</span>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Avariq</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <div suppressHydrationWarning className="flex-1 overflow-auto py-6 px-3">
        <nav className="space-y-6">
          {menuStructure.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {/* Category Header */}
              <div className="px-3 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {section.category}
                </h3>
              </div>
              
              {/* Category Items */}
              <div className="space-y-1">
                {section.items.map((item, itemIndex) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && item.href !== '/crm' && pathname.startsWith(item.href + '/'));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={itemIndex}
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-all duration-200
                        ${isActive
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                          : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div suppressHydrationWarning className="shrink-0 border-t border-gray-800 p-4">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-gray-400 hover:text-gray-100 hover:bg-gray-800/50"
        >
          <LogOut className="h-4 w-4 mr-3" />
          Logout
        </Button>
        <div className="mt-3 px-3">
          <p className="text-xs text-gray-600">POWERED BY</p>
          <p className="text-xs text-gray-500 font-semibold mt-0.5">AVARIQ</p>
        </div>
      </div>
    </div>
  )
}
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

            <Button 
              variant="outline" 
              className="w-full gap-2 justify-start"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
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
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleLogout}
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}