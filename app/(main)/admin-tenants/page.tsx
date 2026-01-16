'use client'

import { useEffect, useState } from 'react'
import { listAllTenants, getTenantSiteStatus, deleteTenantSite, restartTenantSite } from '@/app/actions/admin-tenants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Tenant {
  name: string
  subdomain: string
  company_name: string
  owner_email: string
  site_url: string
  status: string
  creation: string
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [siteStatuses, setSiteStatuses] = useState<Record<string, any>>({})

  useEffect(() => {
    loadTenants()
  }, [])

  async function loadTenants() {
    setLoading(true)
    const result = await listAllTenants()
    if (result.success && result.tenants) {
      setTenants(result.tenants)
      
      // Load site status for each tenant
      for (const tenant of result.tenants) {
        const status = await getTenantSiteStatus(tenant.site_url)
        setSiteStatuses(prev => ({ ...prev, [tenant.name]: status }))
      }
    }
    setLoading(false)
  }

  async function handleDelete(tenantName: string, siteUrl: string) {
    if (!confirm(`Delete tenant "${tenantName}" and all its data? This cannot be undone!`)) {
      return
    }

    const result = await deleteTenantSite(tenantName, siteUrl)
    if (result.success) {
      alert('Tenant deleted successfully')
      loadTenants()
    } else {
      alert(`Failed to delete: ${result.error}`)
    }
  }

  async function handleRestart(siteUrl: string) {
    const result = await restartTenantSite(siteUrl)
    if (result.success) {
      alert('Site cache cleared successfully')
    } else {
      alert(`Failed to restart: ${result.error}`)
    }
  }

  if (loading) {
    return <div className="p-8">Loading tenants...</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground">Manage all tenant sites and databases</p>
        </div>
        <Button onClick={loadTenants}>Refresh</Button>
      </div>

      <div className="grid gap-4">
        {tenants.map(tenant => {
          const status = siteStatuses[tenant.name]
          return (
            <Card key={tenant.name}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{tenant.company_name}</CardTitle>
                    <CardDescription>
                      <div className="space-y-1 mt-2">
                        <div><strong>Subdomain:</strong> {tenant.subdomain}</div>
                        <div><strong>Site URL:</strong> <a href={`https://${tenant.site_url}`} target="_blank" rel="noopener" className="text-blue-600 hover:underline">{tenant.site_url}</a></div>
                        <div><strong>Owner:</strong> {tenant.owner_email}</div>
                        <div><strong>Created:</strong> {new Date(tenant.creation).toLocaleDateString()}</div>
                      </div>
                    </CardDescription>
                  </div>
                  <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                    {tenant.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {status?.exists ? (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <strong>Database:</strong> {status.database}
                    </div>
                    {status.apps && (
                      <div className="text-sm">
                        <strong>Apps:</strong> {status.apps.join(', ')}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleRestart(tenant.site_url)}>
                        Clear Cache
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(tenant.name, tenant.site_url)}>
                        Delete Site
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-yellow-600">
                    ⚠️ Site not found in Frappe. May need manual cleanup.
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {tenants.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No tenants found. Create one through the signup page.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
