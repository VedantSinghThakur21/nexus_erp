'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
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
  UserCircle,
  Zap,
  ShoppingCart,
  Layers,
  Tag,
  Bot
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from 'react'

// Organized menu structure by category matching HTML design
const menuStructure = [
  {
    category: 'MAIN',
    items: [
      { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { name: 'Leads', icon: Users, href: '/crm' },
      { name: 'Opportunities', icon: TrendingUp, href: '/crm/opportunities' },
    ]
  },
  {
    category: 'SALES',
    items: [
      { name: 'Quotations', icon: Receipt, href: '/quotations' },
      { name: 'Sales Orders', icon: ShoppingCart, href: '/sales-orders' },
      { name: 'Invoices', icon: FileText, href: '/invoices' },
      { name: 'Payments', icon: Wallet, href: '/payments' },
    ]
  },
  {
    category: 'INVENTORY',
    items: [
      { name: 'Catalogue', icon: Layers, href: '/catalogue' },
      { name: 'Pricing Rules', icon: Tag, href: '/pricing-rules' },
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
    category: 'MANAGEMENT',
    items: [
      { name: 'Team', icon: Users, href: '/team' },
      { name: 'Settings', icon: Settings, href: '/settings' },
      { name: 'AI Agent', icon: Bot, href: '/agents' },
    ]
  }
]

// Reusable Sidebar Content
function SidebarContent() {
  const pathname = usePathname()

  return (
    <div
      suppressHydrationWarning
      className="flex h-full flex-col bg-[#151B28] text-gray-100 border-r border-black/20"
    >
      {/* Logo Area - matching HTML design */}
      <div suppressHydrationWarning className="p-4 flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 bg-[#FFCC3F] rounded flex items-center justify-center text-[#1A1F2B]">
          <Zap className="h-[18px] w-[18px] font-bold" strokeWidth={3} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold tracking-tight text-white leading-none">Avariq</h1>
          <span className="text-[8px] font-bold text-[#FFCC3F] tracking-[0.2em] uppercase">Ultimate</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 pb-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600/50 scrollbar-track-transparent hover:scrollbar-thumb-gray-500">
        <div className="space-y-0.5">
          {menuStructure.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {/* Category Header - matching HTML styling */}
              <div className="px-4 mt-5 mb-1.5 first:mt-2">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {section.category}
                </h3>
              </div>

              {/* Category Items */}
              <div className="space-y-0.5">
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
                        flex items-center gap-2.5 px-3 py-2 rounded-md text-[14px] font-medium
                        transition-all duration-200
                        ${isActive
                          ? 'bg-[#5B6FE3] text-white'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer - matching HTML design */}
      <div suppressHydrationWarning className="p-4 border-t border-white/5 shrink-0 bg-black/10">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[8px] font-bold text-gray-500 uppercase tracking-[0.3em]">Powered by</span>
          <span className="text-[10px] font-bold text-white tracking-[0.2em]">AVARIQ</span>
        </div>
      </div>
    </div>
  )
}

// Main Responsive Component
export function AppSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile Sidebar (Drawer) */}
      <div suppressHydrationWarning className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild suppressHydrationWarning>
            <Button
              variant="outline"
              size="icon"
              className="bg-white shadow-lg border-gray-300"
              suppressHydrationWarning
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px] bg-[#151B28]">
            <div className="h-full" onClick={() => setOpen(false)}>
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar (Fixed) - 260px width per specs */}
      <div
        suppressHydrationWarning
        className="hidden lg:flex h-screen w-[280px] flex-col shrink-0 bg-[#151B28]"
      >
        <SidebarContent />
      </div>
    </>
  )
}