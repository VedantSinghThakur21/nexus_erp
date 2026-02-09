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
import { Building2, Mail, Lock, Rocket, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)

    // Call the new Server Action
    const result = await initiateSignup(formData)

    if (result && !result.success) {
      setError(result.error || 'Signup failed')
      setIsLoading(false)
    }
    // If successful, initiateSignup will redirect to /provisioning automatically
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Rocket className="w-6 h-6 text-primary" />
            </div>
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

            {/* Hidden field for plan */}
            <input type="hidden" name="plan" value="Free" />

            {/* Added Full Name as per user request */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
              <Input id="fullName" name="fullName" placeholder="John Doe" required disabled={isLoading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="organizationName" name="organizationName" placeholder="Acme Corporation" required disabled={isLoading} className="pl-10" autoComplete="organization" />
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
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initiating Setup...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Start Free Trial
                </>
              )}
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
              onClick={() => signIn('google')}
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

import { initiateSignup } from '@/app/actions/signup'
