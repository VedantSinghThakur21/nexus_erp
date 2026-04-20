/**
 * User Context - Client-side user role and permission management
 *
 * Provides user role state and permission checks throughout the app.
 * Integrates with Frappe ERPNext roles via API.
 *
 * Performance: roles are cached in sessionStorage for 5 minutes so navigating
 * between pages does not incur a fresh Frappe round-trip every time.
 */
'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  canAccessModule,
  getAccessibleModules,
  getPrimaryRole,
  getPermissionLevel,
  canPerformAction,
  type PermissionLevel,
} from '@/lib/role-permissions'

// ── Cache constants ──────────────────────────────────────────────────────────
const CACHE_KEY = 'nexus_user_roles_cache'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const FETCH_TIMEOUT_MS = 8_000 // first attempt
const FETCH_RETRY_TIMEOUT_MS = 30_000 // second attempt — provisioning / Frappe sometimes cold-starts slowly
const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/signup',
  '/onboarding',
  '/auth/login',
  '/auth/callback',
  '/provisioning',
  '/provisioning-status',
  '/change-password',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

interface RolesCache {
  roles: string[]
  ts: number
}

function readCache(): string[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed: RolesCache = JSON.parse(raw)
    if (Date.now() - parsed.ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY)
      return null
    }
    return parsed.roles
  } catch {
    return null
  }
}

function writeCache(roles: string[]) {
  try {
    const entry: RolesCache = { roles, ts: Date.now() }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // sessionStorage may be unavailable in some iframe contexts — ignore
  }
}

function clearCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY)
  } catch {}
}

// ── Context types ─────────────────────────────────────────────────────────────
interface UserContextType {
  roles: string[]
  loading: boolean
  error: string | null
  hasRole: (role: string) => boolean
  canAccess: (module: string) => boolean
  getPermission: (module: string) => PermissionLevel
  canPerform: (module: string, action: string) => boolean
  accessibleModules: string[]
  primaryRole: string
  refreshRoles: () => Promise<void>
}

const UserContext = createContext<UserContextType | null>(null)

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Hydrate from cache only when we have a non-empty role list. A cached `[]`
  // often comes from a timed-out fetch (previously written) and must not skip
  // a fresh network round-trip.
  const [roles, setRoles] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    const cached = readCache()
    return cached && cached.length > 0 ? cached : []
  })
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true
    const cached = readCache()
    return cached === null || cached.length === 0
  })
  const [error, setError] = useState<string | null>(null)

  const fetchRoles = useCallback(async (force = false) => {
    if (!force) {
      const cached = readCache()
      if (cached !== null && cached.length > 0) {
        setRoles(cached)
        setLoading(false)
        return
      }
    }

    try {
      setLoading(true)
      setError(null)

      const fetchOnce = async (timeoutMs: number): Promise<{ roles?: string[] }> => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeoutMs)
        try {
          const response = await fetch('/api/user/roles', {
            signal: controller.signal,
            credentials: 'include',
            cache: 'no-store',
          })
          clearTimeout(timer)

          if (!response.ok) {
            throw new Error(`Roles API returned ${response.status}`)
          }

          return (await response.json()) as { roles?: string[] }
        } catch (e: any) {
          clearTimeout(timer)
          throw e
        }
      }

      let data: { roles?: string[] } = {}
      try {
        data = await fetchOnce(FETCH_TIMEOUT_MS)
      } catch (firstErr: any) {
        if (firstErr?.name === 'AbortError') {
          console.warn('[UserContext] Role fetch timed out — retrying with a longer deadline')
          try {
            data = await fetchOnce(FETCH_RETRY_TIMEOUT_MS)
          } catch (retryErr: any) {
            console.warn('[UserContext] Role fetch retry failed:', retryErr?.message || retryErr)
            setRoles([])
            clearCache()
            return
          }
        } else {
          throw firstErr
        }
      }

      const fetchedRoles = data.roles || []
      setRoles(fetchedRoles)
      if (fetchedRoles.length > 0) {
        writeCache(fetchedRoles)
      } else {
        clearCache()
      }
    } catch (err: any) {
      console.error('[UserContext] Failed to fetch roles:', err)
      setError(err.message)
      setRoles([])
      clearCache()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Public pages do not need role resolution and can generate noisy failures
    // while users are unauthenticated. Keep provider lightweight there.
    if (typeof window !== 'undefined' && isPublicPath(window.location.pathname)) {
      setLoading(false)
      return
    }

    fetchRoles()
  }, [fetchRoles])

  const hasRole = useCallback(
    (role: string) => roles.includes(role),
    [roles]
  )

  const canAccess = useCallback(
    (module: string) => canAccessModule(module, roles),
    [roles]
  )

  const getPermission = useCallback(
    (module: string) => getPermissionLevel(module, roles),
    [roles]
  )

  const canPerform = useCallback(
    (module: string, action: string) => canPerformAction(module, action, roles),
    [roles]
  )

  const accessibleModules = getAccessibleModules(roles)
  const primaryRole = getPrimaryRole(roles)

  // refreshRoles force-busts the cache and re-fetches (e.g. after role change)
  const refreshRoles = useCallback(() => {
    clearCache()
    return fetchRoles(true)
  }, [fetchRoles])

  const value: UserContextType = {
    roles,
    loading,
    error,
    hasRole,
    canAccess,
    getPermission,
    canPerform,
    accessibleModules,
    primaryRole,
    refreshRoles,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

/**
 * Hook to access user role context
 * @throws if used outside UserProvider
 */
export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}

/**
 * Hook to check if user can access a specific module
 */
export function useCanAccessModule(module: string): boolean {
  const { canAccess } = useUser()
  return canAccess(module)
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(role: string): boolean {
  const { hasRole } = useUser()
  return hasRole(role)
}

/**
 * Hook to check if user can perform an action on a module
 * e.g. useCanPerformAction('crm', 'create')
 */
export function useCanPerformAction(module: string, action: string): boolean {
  const { canPerform } = useUser()
  return canPerform(module, action)
}
