'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fixTenantSiteUrl, fixAllTenantUrls } from '@/app/actions/fix-tenant'
import { createTenantUser, checkTenantUser } from '@/app/actions/create-tenant-user'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function FixTenantPage() {
  const [subdomain, setSubdomain] = useState('testorganisation-sau')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  // User creation form
  const [userEmail, setUserEmail] = useState('thakurvedant21@gmail.com')
  const [userFullName, setUserFullName] = useState('Vedant Singh Thakur')
  const [userPassword, setUserPassword] = useState('')
  const [userSubdomain, setUserSubdomain] = useState('testorganisation-sau')

  async function handleFixSingle() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fixTenantSiteUrl(subdomain)
      setResult(res)
    } catch (error: any) {
      setResult({ success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleFixAll() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fixAllTenantUrls()
      setResult(res)
    } catch (error: any) {
      setResult({ success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckUser() {
    setLoading(true)
    setResult(null)
    try {
      const res = await checkTenantUser(userEmail, userSubdomain)
      setResult(res)
    } catch (error: any) {
      setResult({ success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateUser() {
    setLoading(true)
    setResult(null)
    try {
      const res = await createTenantUser({
        email: userEmail,
        fullName: userFullName,
        password: userPassword,
        subdomain: userSubdomain
      })
      setResult(res)
    } catch (error: any) {
      setResult({ success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Fix Tenant Issues</h1>
        <p className="text-muted-foreground">
          Tools to fix common tenant provisioning issues
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create User in Tenant Site</CardTitle>
            <CardDescription>
              Create a user account in the provisioned tenant site (needed if site was provisioned but user wasn't created)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={userFullName}
                onChange={(e) => setUserFullName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
            <div className="space-y-2">
              <Label>Tenant Subdomain</Label>
              <Input
                value={userSubdomain}
                onChange={(e) => setUserSubdomain(e.target.value)}
                placeholder="testorganisation-sau"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCheckUser} disabled={loading || !userEmail || !userSubdomain} variant="outline">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Check if User Exists
              </Button>
              <Button onClick={handleCreateUser} disabled={loading || !userEmail || !userPassword || !userSubdomain}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create User
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fix Single Tenant URL</CardTitle>
            <CardDescription>
              Update the site URL for a specific tenant to include subdomain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tenant Subdomain</Label>
              <Input
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                placeholder="testorganisation-sau"
              />
            </div>
            <Button onClick={handleFixSingle} disabled={loading || !subdomain}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Fix Tenant URL
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fix All Tenants</CardTitle>
            <CardDescription>
              Automatically update all tenants with incorrect site URLs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleFixAll} disabled={loading} variant="outline">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Fix All Tenant URLs
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">
                    {result.success ? 'Success' : 'Error'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {result.message || result.error}
                  </p>
                  {result.exists !== undefined && (
                    <div className="text-sm">
                      <strong>User exists:</strong> {result.exists ? 'Yes' : 'No'}
                      {result.user && (
                        <div className="mt-1 text-xs">
                          <div>Email: {result.user.email}</div>
                          <div>Name: {result.user.full_name}</div>
                          <div>Enabled: {result.user.enabled ? 'Yes' : 'No'}</div>
                        </div>
                      )}
                    </div>
                  )}
                  {result.oldUrl && result.newUrl && (
                    <div className="mt-2 text-xs space-y-1">
                      <div><strong>Old URL:</strong> {result.oldUrl}</div>
                      <div><strong>New URL:</strong> {result.newUrl}</div>
                    </div>
                  )}
                  {result.details && (
                    <div className="mt-2 text-xs bg-white/50 p-2 rounded border max-h-32 overflow-auto">
                      <pre>{JSON.stringify(result.details, null, 2)}</pre>
                    </div>
                  )}
                  {result.results && (
                    <div className="mt-2 text-xs bg-white/50 p-2 rounded border max-h-64 overflow-auto">
                      <pre>{JSON.stringify(result.results, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
