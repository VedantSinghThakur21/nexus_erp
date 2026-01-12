import { getTenant, getTenantContext } from '@/lib/tenant'
import { TenantDisplay } from './tenant-display'

/**
 * Example Page: Multi-Tenant Dashboard
 * 
 * Demonstrates:
 * - Server Component: getTenant() and getTenantContext()
 * - Client Component: useClientTenant() (in TenantDisplay)
 * 
 * Test with:
 * - http://tenant1.localhost:3000/example-tenant
 * - http://tenant2.localhost:3000/example-tenant
 * - http://localhost:3000/example-tenant
 */
export default async function ExampleTenantPage() {
  // Get tenant in server component
  const tenant = await getTenant()
  const tenantContext = await getTenantContext()
  
  // Simulate fetching tenant-specific data
  const tenantData = {
    name: tenant === 'default' ? 'Default Organization' : `${tenant.charAt(0).toUpperCase() + tenant.slice(1)} Inc.`,
    users: Math.floor(Math.random() * 100) + 10,
    projects: Math.floor(Math.random() * 50) + 5,
  }
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Multi-Tenant Example</h1>
      
      {/* Server Component Data */}
      <div className="bg-blue-50 dark:bg-blue-950 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-semibold mb-4">Server Component</h2>
        <div className="space-y-2">
          <p><strong>Tenant ID:</strong> <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">{tenant}</code></p>
          <p><strong>Is Default:</strong> {tenantContext.isDefault ? 'Yes' : 'No'}</p>
          <p><strong>Organization:</strong> {tenantData.name}</p>
          <p><strong>Users:</strong> {tenantData.users}</p>
          <p><strong>Projects:</strong> {tenantData.projects}</p>
        </div>
      </div>
      
      {/* Client Component */}
      <TenantDisplay />
      
      {/* Usage Instructions */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Testing Instructions</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Add entries to your <code>/etc/hosts</code> (Mac/Linux) or <code>C:\Windows\System32\drivers\etc\hosts</code> (Windows):
            <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2 text-sm">
{`127.0.0.1 tenant1.localhost
127.0.0.1 tenant2.localhost
127.0.0.1 tenant3.localhost`}
            </pre>
          </li>
          <li>Access different URLs:
            <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
              <li><code>http://tenant1.localhost:3000/example-tenant</code></li>
              <li><code>http://tenant2.localhost:3000/example-tenant</code></li>
              <li><code>http://localhost:3000/example-tenant</code> (default tenant)</li>
            </ul>
          </li>
          <li>Observe how tenant changes based on subdomain</li>
        </ol>
      </div>
      
      {/* Code Examples */}
      <div className="mt-8 bg-green-50 dark:bg-green-950 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Code Examples</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Server Component:</h3>
            <pre className="bg-green-100 dark:bg-green-900 p-3 rounded text-sm overflow-x-auto">
{`import { getTenant } from '@/lib/tenant'

export default async function MyPage() {
  const tenant = await getTenant()
  
  // Fetch tenant-specific data
  const data = await fetchDataForTenant(tenant)
  
  return <div>{data.name}</div>
}`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Server Action:</h3>
            <pre className="bg-green-100 dark:bg-green-900 p-3 rounded text-sm overflow-x-auto">
{`'use server'
import { getTenant } from '@/lib/tenant'

export async function createProject(formData: FormData) {
  const tenant = await getTenant()
  
  // Save to tenant-specific database/schema
  await db.insert({ tenant, ...data })
}`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Client Component:</h3>
            <pre className="bg-green-100 dark:bg-green-900 p-3 rounded text-sm overflow-x-auto">
{`'use client'
import { useClientTenant } from '@/lib/tenant'

export function MyComponent() {
  const tenant = useClientTenant()
  
  return <div>Current tenant: {tenant}</div>
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
