import { fullCleanup } from '@/app/actions/cleanup-tenants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { redirect } from 'next/navigation'

export default async function CleanupPage({
  searchParams
}: {
  searchParams: Promise<{ confirm?: string }>
}) {
  const params = await searchParams
  
  if (params.confirm !== 'yes') {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">⚠️ Danger Zone: Full Cleanup</CardTitle>
            <CardDescription>
              This will delete ALL tenants and users (except Administrator) from the master database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">
              This action is irreversible and should only be used in development/testing.
            </p>
            <a 
              href="/cleanup?confirm=yes" 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-red-600 text-white px-4 py-2 hover:bg-red-700"
            >
              ⚠️ Yes, Delete Everything
            </a>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Execute cleanup
  const result = await fullCleanup()

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Cleanup Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Tenants</h3>
              <p>Deleted: {result.tenants.deleted}</p>
              {result.tenants.errors && (
                <p className="text-red-600">Errors: {result.tenants.errors.length}</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold">Users</h3>
              <p>Deleted: {result.users.deleted}</p>
              {result.users.errors && (
                <p className="text-red-600">Errors: {result.users.errors.length}</p>
              )}
            </div>
            <div className="pt-4">
              <a 
                href="/login" 
                className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground px-4 py-2 hover:bg-primary/90"
              >
                Go to Login
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
