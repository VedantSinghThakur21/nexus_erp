import { Suspense } from 'react'
import { CreateTenantDialog } from '@/components/tenants/create-tenant-dialog'
import { getAllTenants } from '@/app/actions/tenants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function TenantsPage() {
  const tenants = await getAllTenants()

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground">
            Manage customer sites and subscriptions
          </p>
        </div>
        <CreateTenantDialog />
      </div>

      <div className="grid gap-4">
        {tenants.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No tenants yet. Create your first tenant to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          tenants.map((tenant: any) => (
            <Card key={tenant.name}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{tenant.company_name}</CardTitle>
                    <CardDescription>
                      {tenant.subdomain}.nexuserp.com
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={
                      tenant.status === 'active' ? 'default' :
                      tenant.status === 'trial' ? 'secondary' :
                      tenant.status === 'suspended' ? 'destructive' :
                      'outline'
                    }>
                      {tenant.status}
                    </Badge>
                    <Badge variant="outline">{tenant.plan}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Owner</p>
                    <p className="font-medium">{tenant.owner_name}</p>
                    <p className="text-xs text-muted-foreground">{tenant.owner_email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Site URL</p>
                    <a 
                      href={tenant.site_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {tenant.site_url}
                    </a>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="text-xs">
                      {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Provisioned</p>
                    <p className="text-xs">
                      {tenant.provisioned_at ? new Date(tenant.provisioned_at).toLocaleDateString() : 'Pending'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
