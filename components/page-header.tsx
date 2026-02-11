'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getUserProfile, type UserProfile } from '@/app/actions/profile'
import { logoutUser } from '@/app/actions/user-auth'
import { signOut } from 'next-auth/react'

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

    const displayName = profile?.fullName || 'Loading...'
    const displayRole = profile?.role || ''
    const initials = profile?.initials || '...'

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 w-full z-10">
            <div className="relative w-[480px]">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                    search
                </span>
                <input
                    className="w-full bg-slate-100 border-none rounded-full py-2.5 pl-11 pr-5 text-sm focus:ring-2 focus:ring-primary/20 placeholder:text-slate-500"
                    placeholder={searchPlaceholder}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-6">
                {/* Extra action buttons (e.g., "New Lead") */}
                {children}

                {/* Notifications */}
                <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                    <span className="material-symbols-outlined">notifications</span>
                </button>
                <div className="h-8 w-px bg-slate-200"></div>

                {/* Profile Section with Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        className="flex items-center gap-3 pl-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        <div className="text-right">
                            <p className="text-sm font-semibold leading-tight text-slate-900">{displayName}</p>
                            {displayRole && (
                                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                    {displayRole}
                                </p>
                            )}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden ring-2 ring-slate-100 flex items-center justify-center text-white font-bold text-sm">
                            {initials}
                        </div>
                    </button>

                    {/* Dropdown Menu */}
                    {showDropdown && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* User Info */}
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                                <p className="text-sm font-bold text-slate-900">{displayName}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{profile?.email || ''}</p>
                                {displayRole && (
                                    <span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider rounded-md">
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
                                    className="w-full px-5 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                                >
                                    <span className="material-symbols-outlined text-lg text-slate-400" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
                                        settings
                                    </span>
                                    Settings
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDropdown(false)
                                        router.push('/team')
                                    }}
                                    className="w-full px-5 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                                >
                                    <span className="material-symbols-outlined text-lg text-slate-400" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
                                        group
                                    </span>
                                    Team
                                </button>
                            </div>

                            {/* Logout */}
                            <div className="py-2 border-t border-slate-100">
                                <button
                                    onClick={handleLogout}
                                    disabled={loggingOut}
                                    className="w-full px-5 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3 disabled:opacity-50"
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
        </header>
    )
}
