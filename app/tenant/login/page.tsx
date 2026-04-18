'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Building2, Eye, EyeOff } from 'lucide-react'
import { useClientTenant } from '@/lib/tenant-client'
import { loginUser } from '@/app/actions/user-auth'
import Link from 'next/link'

/**
 * Tenant-specific login page (tesla.avariq.in/login)
 * Tenant-scoped login using the shared auth visual system.
 */
export default function TenantLoginPage() {
  const tenant = useClientTenant()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const sessionNotice = searchParams.get('reason') === 'session_expired'
    ? 'Session expired. Please re-login.'
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await loginUser(usernameOrEmail, password)

      if (!result.success) {
        setError('error' in result ? result.error : 'Login failed')
        return
      }

      if ('redirectUrl' in result && result.redirectUrl) {
        window.location.href = result.redirectUrl
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
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

          {tenant && (
            <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Workspace: {tenant}.avariq.in
            </p>
          )}

          <div className="mb-6">
            <h2 className="text-xl font-medium text-foreground">Sign in</h2>
            <p className="text-sm text-muted-foreground">Enter credentials to access your workspace.</p>
          </div>

            {sessionNotice && (
              <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {sessionNotice}
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email/Username Field */}
              <div className="space-y-2">
                <Label htmlFor="login-email">Email or Username</Label>
                <Input
                  id="login-email"
                  type="text"
                  placeholder="you@company.com"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-10"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                disabled={loading}
                className="mt-2 h-10 w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Back to Main Login */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">Need to access a different workspace?</p>
              <Link href="/login" className="text-sm font-medium text-foreground hover:underline">
                Go to main login →
              </Link>
            </div>
        </div>
      </div>
    </div>
  )
}
