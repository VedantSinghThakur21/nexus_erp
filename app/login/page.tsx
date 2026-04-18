'use client'

import { useMemo, useState } from 'react'
import { loginUser } from '@/app/actions/user-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Building2 } from 'lucide-react'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [loginError, setLoginError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const reason = searchParams.get('reason')
  const sessionNotice = useMemo(() => {
    if (reason === 'session_expired') {
      return 'Session expired. Please re-login.'
    }
    return null
  }, [reason])

  async function handleLogin(formData: FormData) {
    setLoginError(null)
    setLoginLoading(true)

    try {
      const usernameOrEmail = formData.get('email') as string
      const password = formData.get('password') as string

      const result = await loginUser(usernameOrEmail, password)

      if (result.success) {
        if (result.userType === 'tenant') {
          window.location.href = result.redirectUrl
        } else {
          window.location.href = result.dashboardUrl
        }
      } else {
        setLoginError(result.error || 'Invalid username/email or password')
      }
    } catch (error) {
      setLoginError('An error occurred during login')
    } finally {
      setLoginLoading(false)
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
            <h1 className="text-xl font-medium text-foreground">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to continue to your workspace.</p>
          </div>

          {sessionNotice && (
            <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {sessionNotice}
            </p>
          )}

          <form action={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email or Username</Label>
              <Input id="login-email" name="email" type="text" required className="h-10" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {loginError}
              </p>
            )}

            <Button type="submit" disabled={loginLoading} className="h-10 w-full">
              {loginLoading ? 'Authenticating...' : 'Sign In'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              className="h-10 w-full"
            >
              Continue with Google
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-foreground hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
