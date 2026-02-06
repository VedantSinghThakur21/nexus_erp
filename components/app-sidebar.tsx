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
      className="flex h-full flex-col bg-[#151B28] text-gray-100 border-r border-black/20 shadow-2xl rounded-2xl m-2"
    >
      {/* Logo Area - smooth, modern */}
      <div suppressHydrationWarning className="p-6 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 bg-yellow-400/10 rounded-full flex items-center justify-center">
          <Zap className="h-6 w-6 text-yellow-400" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight text-white leading-none">Avariq</h1>
          <span className="text-[9px] font-bold text-yellow-400 tracking-[0.2em] uppercase">Ultimate</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 pb-8 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600/50 scrollbar-track-transparent hover:scrollbar-thumb-gray-500">
        <div className="space-y-1.5">
          {menuStructure.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {/* Category Header - smooth styling */}
              <div className="px-2 mt-6 mb-2 first:mt-2">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
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
                  // Color logic for icons
                  let iconBg = 'bg-gray-700/20';
                  let iconColor = 'text-gray-400';
                  if (item.name === 'Dashboard') { iconBg = 'bg-blue-500/10'; iconColor = 'text-blue-400'; }
                  if (item.name === 'Leads') { iconBg = 'bg-emerald-500/10'; iconColor = 'text-emerald-400'; }
                  if (item.name === 'Opportunities') { iconBg = 'bg-yellow-400/10'; iconColor = 'text-yellow-400'; }
                  if (item.name === 'Quotations') { iconBg = 'bg-purple-500/10'; iconColor = 'text-purple-400'; }
                  if (item.name === 'Sales Orders') { iconBg = 'bg-pink-500/10'; iconColor = 'text-pink-400'; }
                  if (item.name === 'Invoices') { iconBg = 'bg-orange-500/10'; iconColor = 'text-orange-400'; }
                  if (item.name === 'Payments') { iconBg = 'bg-cyan-500/10'; iconColor = 'text-cyan-400'; }
                  if (item.name === 'Catalogue') { iconBg = 'bg-indigo-500/10'; iconColor = 'text-indigo-400'; }
                  if (item.name === 'Pricing Rules') { iconBg = 'bg-fuchsia-500/10'; iconColor = 'text-fuchsia-400'; }
                  if (item.name === 'Projects') { iconBg = 'bg-teal-500/10'; iconColor = 'text-teal-400'; }
                  if (item.name === 'Bookings') { iconBg = 'bg-lime-500/10'; iconColor = 'text-lime-400'; }
                  if (item.name === 'Inspections') { iconBg = 'bg-red-500/10'; iconColor = 'text-red-400'; }
                  if (item.name === 'Operators') { iconBg = 'bg-sky-500/10'; iconColor = 'text-sky-400'; }
                  if (item.name === 'Team') { iconBg = 'bg-green-500/10'; iconColor = 'text-green-400'; }
                  if (item.name === 'Settings') { iconBg = 'bg-gray-500/10'; iconColor = 'text-gray-400'; }
                  if (item.name === 'AI Agent') { iconBg = 'bg-yellow-400/10'; iconColor = 'text-yellow-400'; }
                  return (
                    <Link
                      key={itemIndex}
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg text-[15px] font-medium
                        transition-all duration-200
                        ${isActive
                          ? 'bg-[#5B6FE3] text-white shadow-lg'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full ${iconBg}`}>
                        <Icon className={`h-5 w-5 ${iconColor}`} strokeWidth={2} />
                      </span>
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