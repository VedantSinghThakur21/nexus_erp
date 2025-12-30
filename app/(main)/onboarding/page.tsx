'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '@/types/subscription'
import { Check, Loader2 } from 'lucide-react'
import { createOrganization } from '@/app/actions/organizations'
import { getCurrentUser } from '@/app/actions/user-auth'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>('free')
  const [formData, setFormData] = useState({
    organizationName: '',
    slug: '',
    ownerEmail: ''
  })

  useEffect(() => {
    async function loadUserEmail() {
      const user = await getCurrentUser()
      if (user) {
        setFormData(prev => ({ ...prev, ownerEmail: user }))
      }
    }
    loadUserEmail()
  }, [])

  async function handleSubmit() {
    setLoading(true)
    
    try {
      const result = await createOrganization({
        name: formData.organizationName,
        slug: formData.slug,
        ownerEmail: formData.ownerEmail,
        plan: selectedPlan
      })

      if (result.success) {
        // Redirect to dashboard
        router.push('/dashboard')
      } else {
        alert('Error: ' + (result.error || 'Failed to create organization'))
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome to Nexus ERP</h1>
          <p className="text-slate-600">Let's get your organization set up in just a few steps</p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-4">
            {[1, 2, 3].map((num) => (
              <div key={num} className="flex items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= num
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {num}
                </div>
                {num < 3 && (
                  <div className={`w-16 h-1 ${step > num ? 'bg-blue-600' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Organization Details */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>Tell us about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="organizationName">Organization Name *</Label>
                <Input
                  id="organizationName"
                  placeholder="Acme Corp"
                  value={formData.organizationName}
                  onChange={(e) => {
                    const name = e.target.value
                    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-')
                    setFormData({ ...formData, organizationName: name, slug })
                  }}
                  required
                />
              </div>

              <div>
                <Label htmlFor="slug">Organization Slug *</Label>
                <Input
                  id="slug"
                  placeholder="acme-corp"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  This will be your unique identifier (e.g., acme-corp.nexuserp.com)
                </p>
              </div>

              <div>
                <Label htmlFor="ownerEmail">Your Email *</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.ownerEmail}
                  readOnly
                  className="bg-slate-50"
                />
                <p className="text-xs text-slate-500 mt-1">
                  This is your account email
                </p>
              </div>

              <Button
                onClick={() => setStep(2)}
                className="w-full"
                disabled={!formData.organizationName || !formData.slug || !formData.ownerEmail}
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Choose Plan */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
              <p className="text-slate-600">Start with a 14-day free trial of any plan</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all ${
                    selectedPlan === plan.id
                      ? 'border-2 border-blue-600 shadow-lg'
                      : 'hover:border-slate-400'
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      {selectedPlan === plan.id && (
                        <Badge className="bg-blue-600">Selected</Badge>
                      )}
                    </div>
                    <div className="mt-4">
                      <span className="text-3xl font-bold">₹{plan.price.toLocaleString()}</span>
                      <span className="text-slate-600">/{plan.interval}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features.features.slice(0, 5).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Confirm & Create</CardTitle>
              <CardDescription>Review your details before creating your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                <div>
                  <p className="text-sm text-slate-600">Organization Name</p>
                  <p className="font-semibold text-lg">{formData.organizationName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Slug</p>
                  <p className="font-semibold">{formData.slug}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Owner Email</p>
                  <p className="font-semibold">{formData.ownerEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Plan</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-lg">
                      {SUBSCRIPTION_PLANS[selectedPlan].name}
                    </p>
                    <Badge>14-day trial</Badge>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  🎉 You'll get a <strong>14-day free trial</strong> to explore all features.
                  No credit card required!
                </p>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Organization
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
