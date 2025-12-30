import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PricingTable } from '@/components/subscription/pricing-table'
import { UsageWidget } from '@/components/subscription/usage-widget'
import { Organization, SUBSCRIPTION_PLANS } from '@/types/subscription'

// Mock data - replace with actual organization fetch
async function getCurrentOrganization(): Promise<Organization> {
  // This would fetch from your session/context
  return {
    name: 'Demo Organization',
    slug: 'demo-org',
    subscription: {
      plan: 'free',
      status: 'trial',
      trial_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    usage: {
      users: 1,
      leads: 15,
      projects: 2,
      invoices: 8,
      storage: 45
    },
    owner: 'owner@example.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

export default async function BillingPage() {
  const organization = await getCurrentOrganization()
  const currentPlan = SUBSCRIPTION_PLANS[organization.subscription.plan]

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-slate-600 mt-2">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Plan */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current Plan</CardTitle>
                <Badge 
                  variant={organization.subscription.status === 'active' ? 'default' : 'secondary'}
                >
                  {organization.subscription.status}
                </Badge>
              </div>
              <CardDescription>
                You are currently on the {currentPlan.name} plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">
                    ₹{currentPlan.price.toLocaleString()}
                  </span>
                  <span className="text-slate-600">/{currentPlan.interval}</span>
                </div>

                {organization.subscription.status === 'trial' && organization.subscription.trial_end && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Trial ends:</strong>{' '}
                      {new Date(organization.subscription.trial_end).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}

                <div className="pt-4">
                  <h4 className="font-semibold mb-2">Plan Features:</h4>
                  <ul className="space-y-2">
                    {currentPlan.features.features.map((feature, idx) => (
                      <li key={idx} className="text-sm text-slate-700">
                        • {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <UsageWidget organization={organization} />
      </div>

      {/* Pricing Plans */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Available Plans</h2>
        <PricingTable currentPlan={organization.subscription.plan} />
      </div>
    </div>
  )
}
