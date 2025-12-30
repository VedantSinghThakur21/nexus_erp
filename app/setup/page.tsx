import { setupERPNextDoctypes, linkOrganizationToExistingDocs } from '@/app/actions/setup'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle } from 'lucide-react'

async function runSetup() {
  'use server'
  const doctypeResult = await setupERPNextDoctypes()
  const linkResult = await linkOrganizationToExistingDocs()
  
  return { doctypeResult, linkResult }
}

export default async function SetupPage() {
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
        </CardContent>
      </Card>
    </div>
  )
}
