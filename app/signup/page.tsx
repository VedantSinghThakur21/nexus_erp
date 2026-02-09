'use client'

import { useState, useEffect } from 'react'
import { signupUser } from '@/app/actions/user-auth'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Loader2, Building2, Mail, Lock, Rocket, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const company_name = formData.get('company_name') as string

    // We don't have full name in this form? 
    // The previous form had: Organization Name, Admin Email, Password.
    // user-auth.ts:signupUser expects fullName.
    // let's derive it or add a field. For now, derive from email.
    const fullName = email.split('@')[0]

    try {
      const result = await signupUser({
        email,
        password,
        organizationName: company_name,
        fullName
      })

      if (result && !result.success) {
        setError(result.error || 'Signup failed')
        setIsLoading(false)
      }
      // If successful, signupUser() will redirect automatically
    } catch (err: any) {
      // If it's a redirect, let it happen
      if (err.message?.includes('NEXT_REDIRECT')) {
        return
      }

      setError(err.message || 'An unexpected error occurred')
      setIsLoading(false)
    }
  }

  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)

  const STEPS = [
    "Validating request...",
    "Creating secure database...",
    "Provisioning ERPNext instance...",
    "Configuring administrator access...",
    "Finalizing workspace setup..."
  ]

  // Simulate progress when loading starts
  useEffect(() => {
    if (isLoading) {
      setProgress(0)
      setCurrentStep(0)
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return 95
          return prev + (100 / 30) // roughly 30 seconds
        })
        setCurrentStep(prev => {
          if (prev < STEPS.length - 1 && Math.random() > 0.7) return prev + 1
          return prev
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isLoading])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      {/* Progress Dialog when Loading */}
      <Dialog open={isLoading} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Setting up your Workspace</DialogTitle>
            <DialogDescription>
              Please wait while we provision your dedicated ERP instance. This usually takes about a minute.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-center">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Rocket className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(progress)}%</span>
                <span>Almost there...</span>
              </div>
            </div>

            <div className="space-y-2">
              {STEPS.map((step, index) => (
                <div key={index} className={`flex items-center gap-3 text-sm transition-colors ${index === currentStep ? 'text-blue-600 font-medium' :
                  index < currentStep ? 'text-green-600' : 'text-slate-400'
                  }`}>
                  {index < currentStep ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : index === currentStep ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-slate-300" />
                  )}
                  {step}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            {/* ... header content ... */}
          </div>
          <CardTitle className="text-2xl font-bold">Create your workspace</CardTitle>
          <CardDescription>
            Get started with your own ERPNext instance in minutes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* ... Form Fields (Company, Email, Password) ... */}

            <div className="space-y-2">
              <Label htmlFor="company_name">Organization Name <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="company_name" name="company_name" placeholder="Acme Corporation" required disabled={isLoading} className="pl-10" autoComplete="organization" />
              </div>
              <p className="text-xs text-muted-foreground">Your subdomain will be generated from this name</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Admin Email <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" name="email" type="email" placeholder="admin@acmecorp.com" required disabled={isLoading} className="pl-10" autoComplete="email" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="password" name="password" type="password" placeholder="••••••••" required disabled={isLoading} className="pl-10" autoComplete="new-password" minLength={8} />
              </div>
              <p className="text-xs text-muted-foreground">At least 8 characters</p>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg" disabled={isLoading}>
              <Rocket className="mr-2 h-4 w-4" />
              Create Workspace
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-950 px-2 text-slate-500">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              type="button"
              className="w-full border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={(e: React.MouseEvent) => signIn('google')}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" aria-hidden="true" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
              Sign up with Google
            </Button>

            <div className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
