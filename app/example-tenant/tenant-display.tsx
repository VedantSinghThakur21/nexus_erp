'use client'

import { useClientTenant } from '@/lib/tenant'
import { useEffect, useState } from 'react'

/**
 * Client Component demonstrating tenant detection
 * Uses useClientTenant() hook to extract tenant from browser hostname
 */
export function TenantDisplay() {
  const tenant = useClientTenant()
  const [hostname, setHostname] = useState('')
  
  useEffect(() => {
    setHostname(window.location.hostname)
  }, [])
  
  return (
    <div className="bg-purple-50 dark:bg-purple-950 p-6 rounded-lg">
      <h2 className="text-2xl font-semibold mb-4">Client Component</h2>
      <div className="space-y-2">
        <p><strong>Hostname:</strong> <code className="bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded">{hostname || 'Loading...'}</code></p>
        <p><strong>Detected Tenant:</strong> <code className="bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded">{tenant}</code></p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          This tenant value is extracted client-side from window.location.hostname
        </p>
      </div>
    </div>
  )
}
