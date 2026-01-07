'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Loader2, Database, TestTube, Shield } from 'lucide-react'
import { setupTenantDocType, verifyTenantSetup, createTestTenant } from '@/app/actions/setup-tenant'

interface SetupResult {
  success: boolean
  message: string
  details?: any
}

export default function SetupTenantPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, SetupResult>>({})

  async function handleSetup() {
    setLoading('setup')
    try {
      const result = await setupTenantDocType()
      setResults(prev => ({ ...prev, setup: result }))
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        setup: { success: false, message: error.message }
      }))
    } finally {
      setLoading(null)
    }
  }

  async function handleVerify() {
    setLoading('verify')
    try {
      const result = await verifyTenantSetup()
      setResults(prev => ({ ...prev, verify: result }))
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        verify: { success: false, message: error.message }
      }))
    } finally {
      setLoading(null)
    }
  }

  async function handleTestTenant() {
    setLoading('test')
    try {
      const result = await createTestTenant()
      setResults(prev => ({ ...prev, test: result }))
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        test: { success: false, message: error.message }
      }))
    } finally {
      setLoading(null)
    }
  }

  function ResultCard({ title, result, icon: Icon }: { title: string; result?: SetupResult; icon: any }) {
    if (!result) return null

    return (
      <Card className={result.success ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{result.message}</p>
              {result.details && (
                <div className="mt-2 text-xs bg-white/50 p-2 rounded border">
                  <pre className="overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Tenant Setup</h1>
        <p className="text-muted-foreground">
          Set up the Tenant DocType in your ERPNext master site for multi-tenancy support
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>Follow these steps in order to set up multi-tenancy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
              1
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Create Tenant DocType
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Creates the custom Tenant DocType in your ERPNext master site with all necessary fields for tracking subscriptions, usage, and site configuration.
              </p>
              <Button
                onClick={handleSetup}
                disabled={loading !== null}
                className="mb-3"
              >
                {loading === 'setup' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Tenant DocType'
                )}
              </Button>
              {results.setup && <ResultCard title="Setup Result" result={results.setup} icon={Database} />}
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
              2
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Verify Setup
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Verifies that the Tenant DocType was created correctly with all required fields.
              </p>
              <Button
                onClick={handleVerify}
                disabled={loading !== null}
                variant="outline"
                className="mb-3"
              >
                {loading === 'verify' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Setup'
                )}
              </Button>
              {results.verify && <ResultCard title="Verification Result" result={results.verify} icon={Shield} />}
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
              3
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Create Test Tenant (Optional)
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Creates a test tenant record to verify everything is working. This is optional but recommended for testing.
              </p>
              <Button
                onClick={handleTestTenant}
                disabled={loading !== null}
                variant="secondary"
                className="mb-3"
              >
                {loading === 'test' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Test Tenant'
                )}
              </Button>
              {results.test && <ResultCard title="Test Tenant Result" result={results.test} icon={TestTube} />}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What happens next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="mt-0.5">1</Badge>
            <p>The Tenant DocType will store all customer organization data in your master ERPNext site</p>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="mt-0.5">2</Badge>
            <p>Each tenant will track usage (users, leads, projects, invoices) against their subscription plan</p>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="mt-0.5">3</Badge>
            <p>When users sign up, a new tenant record will be created automatically</p>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="mt-0.5">4</Badge>
            <p>Usage limits will be enforced based on subscription plan (Free/Pro/Enterprise)</p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Make sure your environment variables are set correctly in <code>.env.local</code> with your ERPNext API credentials before running this setup.
        </p>
      </div>
    </div>
  )
}
