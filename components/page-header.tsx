'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getUserProfile, type UserProfile } from '@/app/actions/profile'
import { logoutUser } from '@/app/actions/user-auth'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface PageHeaderProps {
    searchQuery?: string
    onSearchChange?: (query: string) => void
    searchPlaceholder?: string
    children?: React.ReactNode  // For action buttons like "New Lead"
}

export function PageHeader({
    searchQuery = '',
    onSearchChange,
    searchPlaceholder = 'Ask AI anything...',
    children
}: PageHeaderProps) {
    const router = useRouter()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [showDropdown, setShowDropdown] = useState(false)
    const [loggingOut, setLoggingOut] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        getUserProfile().then(setProfile)
    }, [])

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    async function handleLogout() {
        setLoggingOut(true)
        try {
            // Clear Frappe session + cookies
            await logoutUser()
            try { sessionStorage.removeItem('nexus_user_roles_cache') } catch {}
            // Clear NextAuth session
            await signOut({ redirect: false })
            // Redirect to login
            router.push('/login')
        } catch (error) {
            console.error('Logout failed:', error)
            // Force redirect even on error
            router.push('/login')
        }
    }

    const displayName = profile?.fullName || 'Nexus User'
    const displayRole = profile?.role || ''
    const initials = profile?.initials || 'NU'

    return (
        <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex h-full items-center justify-between gap-3 px-4 pl-14 md:px-6 md:pl-6">
            <div className="relative w-full flex-1 md:max-w-xl">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base">
                    search
                </span>
                <Input
                    className="h-9 rounded-md border-border bg-muted/40 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-background border-border/60 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder={searchPlaceholder}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-3">
                {/* Extra action buttons (e.g., "New Lead") */}
                <div className="hidden items-center gap-2 lg:flex">
                  {children}
                </div>

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="hidden h-9 w-9 rounded-md text-muted-foreground sm:inline-flex">
                    <span className="material-symbols-outlined">notifications</span>
                </Button>
                <div className="hidden h-6 w-px bg-border sm:block"></div>

                {/* Profile Section with Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        <div className="hidden text-right md:block">
                            <p className="text-sm font-medium leading-tight text-foreground">{displayName}</p>
                            {displayRole && (
                                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                                    {displayRole}
                                </p>
                            )}
                        </div>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-muted text-xs font-medium text-foreground">{initials}</AvatarFallback>
                        </Avatar>
                    </button>

                    {/* Dropdown Menu */}
                    {showDropdown && (
                        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-popover overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 shadow-none">
                            {/* User Info */}
                            <div className="px-4 py-3 border-b border-border bg-muted/40">
                                <p className="text-sm font-medium text-foreground">{displayName}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{profile?.email || ''}</p>
                                {displayRole && (
                                    <span className="inline-block mt-2 px-2 py-0.5 bg-accent text-accent-foreground text-[10px] font-medium uppercase tracking-wide rounded-md">
                                        {displayRole}
                                    </span>
                                )}
                            </div>

                            {/* Menu Items */}
                            <div className="py-2">
                                <button
                                    onClick={() => {
                                        setShowDropdown(false)
                                        router.push('/settings')
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-3"
                                >
                                    <span className="material-symbols-outlined text-lg text-muted-foreground" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
                                        settings
                                    </span>
                                    Settings
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDropdown(false)
                                        router.push('/team')
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-3"
                                >
                                    <span className="material-symbols-outlined text-lg text-muted-foreground" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
                                        group
                                    </span>
                                    Team
                                </button>
                            </div>

                            {/* Logout */}
                            <div className="py-2 border-t border-border">
                                <button
                                    onClick={handleLogout}
                                    disabled={loggingOut}
                                    className="w-full px-4 py-2.5 text-left text-sm text-destructive hover:bg-muted transition-colors flex items-center gap-3 disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
                                        logout
                                    </span>
                                    {loggingOut ? 'Signing out...' : 'Sign out'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </header>
    )
}
