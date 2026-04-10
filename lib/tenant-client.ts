'use client'

import { useEffect, useState } from 'react'

/**
 * Client-side hook to get tenant from hostname
 * Use this in Client Components
 * 
 * @returns tenant identifier
 */
export function useClientTenant(): string {
  // Keep initial SSR and first client render consistent to avoid hydration mismatch.
  const [tenant, setTenant] = useState('default')

  useEffect(() => {
    const hostname = window.location.hostname
    setTenant(extractTenantFromHostname(hostname))
  }, [])

  return tenant
}

/**
 * Extracts tenant identifier from hostname
 * Supports:
 * - tenant1.localhost -> "tenant1"
 * - tenant2.example.com -> "tenant2"
 * - localhost -> "default"
 * - example.com -> "default"
 */
function extractTenantFromHostname(hostname: string): string {
  // Remove port if present
  const host = hostname.split(':')[0]

  // Split by dots
  const parts = host.split('.')

  // If it's a subdomain (more than 2 parts, or localhost with subdomain)
  if (parts.length >= 2) {
    // Check if it's subdomain.localhost
    if (parts[parts.length - 1] === 'localhost' && parts.length > 1) {
      return parts[0] // Return subdomain
    }
    // Check if it's subdomain.domain.com
    if (parts.length > 2) {
      return parts[0] // Return subdomain
    }
  }

  // Default tenant for localhost or apex domain
  return 'default'
}
