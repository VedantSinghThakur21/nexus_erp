'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

// Navigation structure matching the HTML sidebar design
const navigationConfig = [
  {
    category: 'Main',
    items: [
      { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
      { name: 'Leads', icon: 'group', href: '/crm' },
      { name: 'Opportunities', icon: 'trending_up', href: '/crm/opportunities' },
    ]
  },
  {
    category: 'Sales',
    items: [
      { name: 'Quotations', icon: 'description', href: '/quotations' },
      { name: 'Sales Orders', icon: 'shopping_cart', href: '/sales-orders' },
      { name: 'Invoices', icon: 'receipt', href: '/invoices' },
      { name: 'Payments', icon: 'account_balance_wallet', href: '/payments' },
    ]
  },
  {
    category: 'Inventory',
    items: [
      { name: 'Catalogue', icon: 'layers', href: '/catalogue' },
      { name: 'Pricing Rules', icon: 'sell', href: '/pricing-rules' },
    ]
  },
  {
    category: 'Operations',
    items: [
      { name: 'Projects', icon: 'folder_open', href: '/projects' },
      { name: 'Bookings', icon: 'calendar_today', href: '/bookings' },
      { name: 'Inspections', icon: 'fact_check', href: '/inspections' },
      { name: 'Operators', icon: 'account_circle', href: '/operators' },
    ]
  },
  {
    category: 'Management',
    items: [
      { name: 'Team', icon: 'group_work', href: '/team' },
      { name: 'Settings', icon: 'settings', href: '/settings' },
      { name: 'AI Agent', icon: 'smart_toy', href: '/agents' },
    ]
  }
]

function SidebarContent() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0B0E14] flex flex-col border-r border-white/5 shadow-2xl">
      {/* Logo Area */}
      <div className="p-6 pb-8 flex items-center space-x-3">
        <div className="w-9 h-9 bg-[#FACC15] rounded flex items-center justify-center">
          <span className="material-symbols-outlined !text-black !font-bold text-[20px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 700, 'GRAD' 0, 'opsz' 24" }}>
            grid_view
          </span>
        </div>
        <span className="text-xl font-bold tracking-tight text-white uppercase">AVARIQ</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll pb-6">
        {navigationConfig.map((section, sectionIndex) => (
          <div key={sectionIndex} className={sectionIndex === 0 ? 'mt-2' : 'mt-8'}>
            {/* Category Header */}
            <p className="px-6 text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-3">
              {section.category}
            </p>

            {/* Category Items */}
            <ul className="space-y-1">
              {section.items.map((item, itemIndex) => {
                // Active route detection
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && item.href !== '/crm' && pathname.startsWith(item.href + '/'))

                return (
                  <li key={itemIndex}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center space-x-3 px-6 py-2.5 relative
                        transition-colors
                        ${isActive
                          ? 'bg-[#1F232B] text-white'
                          : 'text-[#9CA3AF] hover:text-white'
                        }
                      `}
                    >
                      {/* Active indicator line */}
                      {isActive && (
                        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#3B82F6]"></span>
                      )}
                      
                      <span 
                        className="material-symbols-outlined text-[20px]"
                        style={{ fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24" }}
                      >
                        {item.icon}
                      </span>
                      <span className="text-[14px] font-medium">{item.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-white/5">
        <p className="text-[9px] font-bold text-[#6B7280] uppercase tracking-[2px]">
          Powered by AvarIQ
        </p>
      </div>

      <style jsx>{`
        .sidebar-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
      `}</style>
    </aside>
  )
}

// Main Sidebar Component (Desktop Only - matching HTML which is desktop-first)
export function AppSidebar() {
  return <SidebarContent />
}
