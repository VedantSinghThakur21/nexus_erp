import { setupERPNextDoctypes, linkOrganizationToExistingDocs } from '@/app/actions/setup'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle, Info } from 'lucide-react'
import { redirect } from 'next/navigation'

async function runSetup() {
  'use server'
  const doctypeResult = await setupERPNextDoctypes()
  const linkResult = await linkOrganizationToExistingDocs()
  
  return { doctypeResult, linkResult }
}

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ ran?: string }> }) {
  const params = await searchParams
  const hasRun = params.ran === 'true'
  
  let setupResults = null
  if (hasRun) {
    setupResults = await runSetup()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl">System Setup</CardTitle>
          <CardDescription>
            Initialize the subscription and organization management system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Show results if setup has run */}
          {setupResults && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="font-semibold text-green-900">Setup Completed</p>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold mb-2">DocTypes:</p>
                    <div className="space-y-1">
                      {setupResults.doctypeResult.results?.organization && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant={setupResults.doctypeResult.results.organization.status === 'created' ? 'default' : 'secondary'}>
                            {setupResults.doctypeResult.results.organization.status}
                          </Badge>
                          <span>Organization: {setupResults.doctypeResult.results.organization.message}</span>
                        </div>
                      )}
                      {setupResults.doctypeResult.results?.member && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant={setupResults.doctypeResult.results.member.status === 'created' ? 'default' : 'secondary'}>
                            {setupResults.doctypeResult.results.member.status}
                          </Badge>
                          <span>Organization Member: {setupResults.doctypeResult.results.member.message}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold mb-2">Custom Fields:</p>
                    <div className="space-y-1">
                      {setupResults.linkResult.results && Object.entries(setupResults.linkResult.results).map(([doctype, result]: [string, any]) => (
                        <div key={doctype} className="flex items-center gap-2 text-sm">
                          <Badge variant={result.status === 'created' ? 'default' : result.status === 'exists' ? 'secondary' : 'destructive'}>
                            {result.status}
                          </Badge>
                          <span>{doctype}: {result.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <a href="/dashboard" className="flex-1">
                  <Button className="w-full">Go to Dashboard</Button>
                </a>
                <a href="/login" className="flex-1">
                  <Button variant="outline" className="w-full">Go to Login</Button>
                </a>
              </div>
            </div>
          )}

          {/* Show setup instructions if not run yet */}
          {!setupResults && (
            <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>⚠️ Important:</strong> Run this setup only once when first deploying the application.
              This will create custom doctypes in ERPNext for organizations and subscription management.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">This setup will:</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Create <strong>Organization</strong> DocType with subscription fields</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Create <strong>Organization Member</strong> DocType for team management</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Add organization_slug field to Lead, Quotation, Sales Order, Invoice, and Project</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Enable multi-tenant architecture with usage tracking</span>
              </li>
            </ul>
          </div>

          <form action={runSetup}>
            <Button type="submit" className="w-full" size="lg">
              Run Setup
            </Button>
          </form>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-1">Before running setup:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Ensure you have System Manager permissions in ERPNext</li>
                  <li>Backup your ERPNext database</li>
                  <li>If setup fails, doctypes may already exist</li>
                </ul>
              </div>
            </div>
          </div>
          </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
