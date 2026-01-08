'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fixTenantSiteUrl, fixAllTenantUrls } from '@/app/actions/fix-tenant'
import { createTenantUser, checkTenantUser } from '@/app/actions/create-tenant-user'
import { debugTenantConfig, regenerateTenantApiKeys } from '@/app/actions/debug-tenant'
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
  
  // Debug & regenerate keys
  const [debugSubdomain, setDebugSubdomain] = useState('testorganisation-sau')
  const [adminPassword, setAdminPassword] = useState('')

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

  async function handleDebug() {
    setLoading(true)
    setResult(null)
    try {
      const res = await debugTenantConfig(debugSubdomain)
      setResult(res)
    } catch (error: any) {
      setResult({ success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenerateKeys() {
    setLoading(true)
    setResult(null)
    try {
      const res = await regenerateTenantApiKeys(debugSubdomain, adminPassword)
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

      {/* API Authentication Error Notice */}
      <Card className="mb-6 border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold mb-2">⚠️ API Authentication Issues?</h3>
              <p className="text-sm text-muted-foreground mb-3">
                If you're seeing "AuthenticationError" or "UNAUTHORIZED" errors, the master site API keys need to be regenerated.
              </p>
              <div className="text-sm space-y-2 bg-white/50 p-3 rounded border">
                <p className="font-semibold">Quick Fix on Server:</p>
                <code className="block text-xs bg-black text-white p-2 rounded">
                  cd /home/ubuntu/frappe_docker<br/>
                  bash ~/nexus_erp/scripts/fix-master-api-keys.sh
                </code>
                <p className="text-xs mt-2">
                  Then update your .env file with the new keys and restart Next.js.
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  📖 See <strong>docs/FIX_API_AUTH.md</strong> for detailed instructions
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>🔍 Debug Tenant Configuration</CardTitle>
            <CardDescription>
              Check tenant configuration and test API credentials (run this first to diagnose issues)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tenant Subdomain</Label>
              <Input
                value={debugSubdomain}
                onChange={(e) => setDebugSubdomain(e.target.value)}
                placeholder="testorganisation-sau"
              />
            </div>
            <Button onClick={handleDebug} disabled={loading || !debugSubdomain}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Debug Configuration
            </Button>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle>🔑 Regenerate API Keys</CardTitle>
            <CardDescription>
              If API authentication is failing, regenerate the API keys for the tenant site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tenant Subdomain</Label>
              <Input
                value={debugSubdomain}
                onChange={(e) => setDebugSubdomain(e.target.value)}
                placeholder="testorganisation-sau"
              />
            </div>
            <div className="space-y-2">
              <Label>Administrator Password</Label>
              <Input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password used during provisioning"
              />
            </div>
            <Button onClick={handleRegenerateKeys} disabled={loading || !debugSubdomain || !adminPassword}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Regenerate API Keys
            </Button>
          </CardContent>
        </Card>

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
                  {result.debug && (
                    <div className="mt-2 text-xs bg-white/50 p-2 rounded border max-h-96 overflow-auto">
                      <pre>{JSON.stringify(result.debug, null, 2)}</pre>
                    </div>
                  )}
                  {result.keys && (
                    <div className="mt-2 text-xs space-y-1">
                      <div><strong>API Key:</strong> {result.keys.api_key}</div>
                      <div><strong>API Secret:</strong> {result.keys.api_secret}</div>
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
