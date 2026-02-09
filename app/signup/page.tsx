'use client'

import { useState } from 'react'
import { signupUser } from '@/app/actions/user-auth'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Building2, Mail, Lock, Rocket } from 'lucide-react'
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-xl">
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

            <div className="space-y-2">
              <Label htmlFor="company_name">
                Organization Name
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company_name"
                  name="company_name"
                  placeholder="Acme Corporation"
                  required
                  disabled={isLoading}
                  className="pl-10"
                  autoComplete="organization"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Your subdomain will be generated from this name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Admin Email
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@acmecorp.com"
                  required
                  disabled={isLoading}
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="pl-10"
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                At least 8 characters
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Provisioning your workspace...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Create Workspace
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              type="button"
              className="w-full"
              onClick={() => signIn('google')}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Google
            </Button>

            {isLoading && (
              <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <AlertDescription className="text-sm">
                  <div className="space-y-2">
                    <p className="font-medium">This may take 30-60 seconds...</p>
                    <ul className="text-xs space-y-1 ml-4 list-disc text-muted-foreground">
                      <li>Creating your database</li>
                      <li>Installing ERPNext</li>
                      <li>Setting up your workspace</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
