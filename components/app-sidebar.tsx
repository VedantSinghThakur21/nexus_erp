'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import {
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FolderOpen,
  Gauge,
  HandCoins,
  Inbox,
  Layers3,
  Menu,
  ReceiptText,
  Settings,
  ShoppingCart,
  Users,
} from 'lucide-react'
import { useUser } from '@/contexts/user-context'
import { canAccessModule } from '@/lib/role-permissions'
import { getUserProfile, type UserProfile } from '@/app/actions/profile'
import { logoutUser } from '@/app/actions/user-auth'
import { signOut } from 'next-auth/react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'

const COLLAPSE_STORAGE_KEY = 'nexus.sidebar.collapsed'

type NavigationItem = {
  name: string
  icon: ComponentType<{ className?: string }>
  href: string
  module: string
}

const navigationConfig: Array<{ category: string; items: NavigationItem[] }> = [
  {
    category: 'Main',
    items: [
      { name: 'Dashboard', icon: Gauge, href: '/dashboard', module: 'dashboard' },
      { name: 'Leads', icon: Users, href: '/crm/leads', module: 'crm' },
      { name: 'Opportunities', icon: BriefcaseBusiness, href: '/crm/opportunities', module: 'crm' },
    ],
  },
  {
    category: 'Sales',
    items: [
      { name: 'Quotations', icon: CircleDollarSign, href: '/quotations', module: 'quotations' },
      { name: 'Sales Orders', icon: ShoppingCart, href: '/sales-orders', module: 'sales-orders' },
      { name: 'Invoices', icon: ReceiptText, href: '/invoices', module: 'invoices' },
      { name: 'Payments', icon: HandCoins, href: '/payments', module: 'payments' },
    ],
  },
  {
    category: 'Inventory',
    items: [
      { name: 'Catalogue', icon: Layers3, href: '/catalogue', module: 'catalogue' },
      { name: 'Pricing Rules', icon: Settings, href: '/pricing-rules', module: 'pricing-rules' },
    ],
  },
  {
    category: 'Operations',
    items: [
      { name: 'Projects', icon: FolderOpen, href: '/projects', module: 'projects' },
      { name: 'Bookings', icon: CalendarCheck2, href: '/bookings', module: 'bookings' },
      { name: 'Inspections', icon: ClipboardCheck, href: '/inspections', module: 'inspections' },
      { name: 'Operators', icon: Users, href: '/operators', module: 'operators' },
    ],
  },
  {
    category: 'Management',
    items: [
      { name: 'Team', icon: Building2, href: '/team', module: 'team' },
      { name: 'Settings', icon: Settings, href: '/settings', module: 'settings' },
      { name: 'Agent Inbox', icon: Inbox, href: '/agent', module: 'agent-inbox' },
      { name: 'AI Agent', icon: Bot, href: '/agents', module: 'agents' },
    ],
  },
]

function initialsFromProfile(profile: UserProfile | null): string {
  if (!profile?.fullName) return 'NU'
  return profile.fullName
    .split(' ')
    .map((chunk) => chunk[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { roles, loading, error, refreshRoles } = useUser()
  const [pendingAgentActions, setPendingAgentActions] = useState<number>(0)

  // Prefetch routes once roles are resolved so clicking the sidebar feels instant.
  useEffect(() => {
    if (loading) return
    if (!roles || roles.length === 0) return

    const hrefs = navigationConfig
      .flatMap((section) => section.items)
      .filter((item) => canAccessModule(item.module, roles))
      .map((item) => item.href)

    // Prefetch in idle time so we don't compete with initial rendering.
    const run = () => {
      for (const href of hrefs) {
        try {
          router.prefetch(href)
        } catch {
          // ignore
        }
      }
    }

    // requestIdleCallback isn't available in all environments.
    const ric = (globalThis as any).requestIdleCallback as undefined | ((cb: () => void) => number)
    if (ric) {
      const id = ric(run)
      return () => {
        const cancel = (globalThis as any).cancelIdleCallback as undefined | ((id: number) => void)
        if (cancel) cancel(id)
      }
    }

    const t = setTimeout(run, 250)
    return () => clearTimeout(t)
  }, [loading, roles, router])

  useEffect(() => {
    let active = true

    async function loadPendingCount() {
      if (loading || !canAccessModule('agent-inbox', roles)) {
        if (active) setPendingAgentActions(0)
        return
      }

      try {
        const response = await fetch('/api/agent/inbox?limit=100', { cache: 'no-store' })
        if (!response.ok) {
          if (active) setPendingAgentActions(0)
          return
        }

        const data = (await response.json()) as { total?: number; items?: unknown[] }
        const total = typeof data.total === 'number' ? data.total : Array.isArray(data.items) ? data.items.length : 0
        if (active) setPendingAgentActions(total)
      } catch {
        if (active) setPendingAgentActions(0)
      }
    }

    loadPendingCount()
    const timer = setInterval(loadPendingCount, 30000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [loading, roles])

  const filteredNavigationConfig = useMemo(() => {
    return navigationConfig
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => canAccessModule(item.module, roles)),
      }))
      .filter((section) => section.items.length > 0)
  }, [roles])

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {loading && (
        <div className="space-y-3 px-2" aria-busy="true" aria-label="Loading navigation">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded-lg bg-muted/80"
            />
          ))}
        </div>
      )}
      {!loading && filteredNavigationConfig.length === 0 && (
        <div className="space-y-3 px-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {error
              ? 'Could not load your menu permissions. You can try again.'
              : 'No navigation items match your current roles.'}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => void refreshRoles()}
          >
            Reload menu
          </Button>
        </div>
      )}
      {!loading && filteredNavigationConfig.map((section) => (
        <div key={section.category} className="mb-5">
          {!collapsed && (
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {section.category}
            </p>
          )}
          <ul className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && item.href !== '/crm' && pathname.startsWith(`${item.href}/`))

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch
                    onClick={onNavigate}
                    onMouseEnter={() => {
                      try {
                        router.prefetch(item.href)
                      } catch {}
                    }}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
                      collapsed && 'justify-center px-2',
                      isActive && 'font-medium bg-accent text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                    {!collapsed && item.href === '/agent' && pendingAgentActions > 0 && (
                      <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px]">
                        {pendingAgentActions > 99 ? '99+' : pendingAgentActions}
                      </Badge>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function SidebarUser({ collapsed }: { collapsed: boolean }) {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    getUserProfile().then(setProfile).catch(() => setProfile(null))
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logoutUser()
      try { sessionStorage.removeItem('nexus_user_roles_cache') } catch {}
      await signOut({ redirect: false })
    } finally {
      router.push('/login')
      setLoggingOut(false)
    }
  }

  return (
    <div className="border-t border-border p-3">
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted',
              collapsed && 'justify-center px-1'
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-muted text-xs font-medium text-foreground">
                {initialsFromProfile(profile)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-tight text-foreground">
                  {profile?.fullName || 'Nexus User'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {profile?.role || 'Team Member'}
                </p>
              </div>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 rounded-xl border border-border bg-popover p-2 shadow-none">
          <Button
            variant="ghost"
            className="w-full justify-start text-sm"
            onClick={() => router.push('/settings')}
          >
            Settings
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-sm"
            onClick={() => router.push('/team')}
          >
            Team
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-sm text-destructive hover:text-destructive"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSE_STORAGE_KEY)
    if (stored === '1') setCollapsed(true)
  }, [])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <>
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 overflow-hidden border-r border-border/80 bg-card md:flex md:flex-col',
          collapsed ? 'w-[72px]' : 'w-[248px]'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border/60 px-3">
          <Link href="/dashboard" className={cn('flex items-center gap-2', collapsed && 'justify-center')}>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </div>
            {!collapsed && <span className="text-sm font-medium">Nexus ERP</span>}
          </Link>
          <div className="flex items-center gap-1">
            {!collapsed && <ThemeToggle />}
            {!collapsed && (
              <Button size="icon-sm" variant="ghost" onClick={toggleCollapsed} className="h-7 w-7">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            {collapsed && (
              <Button size="icon-sm" variant="ghost" onClick={toggleCollapsed} className="h-7 w-7">
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <SidebarNav collapsed={collapsed} />
        <SidebarUser collapsed={collapsed} />
      </aside>

      <div className="fixed left-3 top-3 z-40 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="h-9 w-9 border-border bg-background">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 border-r border-border p-0">
            <SheetHeader className="h-14 border-b border-border px-3">
              <SheetTitle className="flex items-center gap-2 text-sm font-medium">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Building2 className="h-4 w-4" />
                </div>
                Nexus ERP
              </SheetTitle>
            </SheetHeader>
            <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
            <SidebarUser collapsed={false} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
