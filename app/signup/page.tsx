'use client'

import { useState } from 'react'
import { initiateSignup } from '@/app/actions/signup'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { Building2, Mail, Lock, Loader2, User } from 'lucide-react'

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const result = await initiateSignup(formData)

    if (result && !result.success) {
      setError(result.error || 'Signup failed')
      setIsLoading(false)
    }
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-muted/40 px-4 py-8">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center">
        <div className="w-full rounded-xl border border-border bg-card p-6 md:p-8">
          <Link href="/" className="mb-6 flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="text-base font-medium text-foreground">Nexus ERP</span>
          </Link>

          <div className="mb-6 text-center">
            <h1 className="text-xl font-medium text-foreground">Create your workspace</h1>
            <p className="text-sm text-muted-foreground">Get started in minutes with a new organization.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-xs text-red-400 font-mono bg-red-500/10 p-3 border border-red-500/20">
                {error}
              </div>
            )}

            <input type="hidden" name="plan" value="Free" />

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="John Doe"
                  required
                  disabled={isLoading}
                  className="h-10 pr-10"
                />
                <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization</Label>
              <div className="relative">
                <Input
                  id="organizationName"
                  name="organizationName"
                  placeholder="Acme Corporation"
                  required
                  disabled={isLoading}
                  className="h-10 pr-10"
                />
                <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground">Your subdomain is generated from this name.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@acmecorp.com"
                  required
                  disabled={isLoading}
                  className="h-10 pr-10"
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  minLength={8}
                  className="h-10 pr-10"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground">At least 8 characters.</p>
            </div>

            <Button
              type="submit"
              className="h-10 w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Initiating Setup...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Start Free Trial
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              type="button"
              className="h-10 w-full"
              onClick={() => signIn('google')}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
              </svg>
              Sign up with Google
            </Button>

            <div className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-foreground hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
