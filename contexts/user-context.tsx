/**
 * User Context - Client-side user role and permission management
 * 
 * Provides user role state and permission checks throughout the app.
 * Integrates with Frappe ERPNext roles via API.
 */
'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  canAccessModule,
  getAccessibleModules,
  getPrimaryRole,
  getPermissionLevel,
  type PermissionLevel,
} from '@/lib/role-permissions'

interface UserContextType {
  roles: string[]
  loading: boolean
  error: string | null
  hasRole: (role: string) => boolean
  canAccess: (module: string) => boolean
  getPermission: (module: string) => PermissionLevel
  accessibleModules: string[]
  primaryRole: string
  refreshRoles: () => Promise<void>
}

const UserContext = createContext<UserContextType | null>(null)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [roles, setRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/user/roles')
      
      if (!response.ok) {
        throw new Error('Failed to fetch user roles')
      }
      
      const data = await response.json()
      setRoles(data.roles || [])
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

  const accessibleModules = getAccessibleModules(roles)
  const primaryRole = getPrimaryRole(roles)

  const value: UserContextType = {
    roles,
    loading,
    error,
    hasRole,
    canAccess,
    getPermission,
    accessibleModules,
    primaryRole,
    refreshRoles: fetchRoles,
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
