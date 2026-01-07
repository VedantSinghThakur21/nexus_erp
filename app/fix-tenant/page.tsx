'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { fixTenantSiteUrl, fixAllTenantUrls } from '@/app/actions/fix-tenant'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function FixTenantPage() {
  const [subdomain, setSubdomain] = useState('testorganisation-sau')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

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

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Fix Tenant URLs</h1>
        <p className="text-muted-foreground">
          Update tenant site URLs to include subdomain for proper multi-tenant routing
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Fix Single Tenant</CardTitle>
            <CardDescription>
              Update the site URL for a specific tenant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tenant Subdomain</label>
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
                  <p className="text-sm text-muted-foreground">
                    {result.message || result.error}
                  </p>
                  {result.oldUrl && result.newUrl && (
                    <div className="mt-2 text-xs space-y-1">
                      <div><strong>Old URL:</strong> {result.oldUrl}</div>
                      <div><strong>New URL:</strong> {result.newUrl}</div>
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
