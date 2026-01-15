'use client'

import { useState, useCallback } from 'react'
import { api, APIError, type User } from '@/lib/api-client'

/**
 * React Hook for API calls with loading and error states
 * Handles common patterns: loading, error, and success states
 */
export function useAPI<T = any>() {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await apiCall()
      setData(result)
      return result
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])
  
  return { data, loading, error, execute, reset }
}

/**
 * Hook for user authentication state
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fetchUser = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const userData = await api.get<User>('/users/me')
      setUser(userData)
      return userData
    } catch (err) {
      if (err instanceof APIError) {
        if (err.status === 401) {
          setUser(null)
          setError('Not authenticated')
        } else {
          setError(err.message)
        }
      } else {
        setError('Failed to fetch user')
      }
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  const logout = useCallback(() => {
    // Clear token from storage
    localStorage.removeItem('access_token')
    sessionStorage.removeItem('access_token')
    setUser(null)
  }, [])
  
  return { user, loading, error, fetchUser, logout }
}
