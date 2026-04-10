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
const FETCH_TIMEOUT_MS = 8_000 // 8 s — give up and render with [] rather than blocking forever

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
  // Initialise from cache immediately so the first render can already have roles.
  const [roles, setRoles] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    return readCache() ?? []
  })
  const [loading, setLoading] = useState(() => {
    // If we had a cache hit, we're not "loading" — skip the spinner.
    if (typeof window === 'undefined') return true
    return readCache() === null
  })
  const [error, setError] = useState<string | null>(null)

  const fetchRoles = useCallback(async (force = false) => {
    // Return cached version unless caller explicitly bypasses the cache.
    if (!force) {
      const cached = readCache()
      if (cached !== null) {
        setRoles(cached)
        setLoading(false)
        return
      }
    }

    try {
      setLoading(true)
      setError(null)

      // Enforce a hard timeout so a slow/unreachable backend doesn't block the UI.
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

      let data: { roles?: string[] } = {}
      try {
        const response = await fetch('/api/user/roles', {
          signal: controller.signal,
          credentials: 'include',
          // Prevent the browser from serving a stale cached response
          cache: 'no-store',
        })
        clearTimeout(timer)

        if (!response.ok) {
          throw new Error(`Roles API returned ${response.status}`)
        }

        data = await response.json()
      } catch (fetchErr: any) {
        clearTimeout(timer)
        if (fetchErr.name === 'AbortError') {
          console.warn('[UserContext] Role fetch timed out — using empty roles to allow UI render')
        } else {
          throw fetchErr
        }
      }

      const fetchedRoles = data.roles || []
      setRoles(fetchedRoles)
      writeCache(fetchedRoles)
    } catch (err: any) {
      console.error('[UserContext] Failed to fetch roles:', err)
      setError(err.message)
      setRoles([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
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
