'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Building2 } from 'lucide-react'
import { useClientTenant } from '@/lib/tenant-client'
import { loginUser } from '@/app/actions/user-auth'

/**
 * Tenant-specific login page (tesla.avariq.in/login)
 * Clean workspace-focused login matching Frappe's aesthetic
 * Built with Nexus design system (Slate/Indigo, Shadcn UI)
 */
export default function TenantLoginPage() {
  const tenant = useClientTenant()
  const router = useRouter()

  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-lg">
          {/* Card Header */}
          <CardHeader className="space-y-4 pb-6 text-center">
            {/* Workspace Icon */}
            <div className="flex justify-center mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700">
                <Building2 className="w-6 h-6 text-slate-700 dark:text-slate-300" />
              </div>
            </div>

            {/* Title */}
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              Sign in to your workspace
            </CardTitle>

            {/* Workspace Domain */}
            {tenant && (
              <CardDescription className="text-base font-medium text-slate-600 dark:text-slate-400">
                <span className="text-slate-900 dark:text-slate-100">
                  {tenant}.avariq.in
                </span>
              </CardDescription>
            )}
          </CardHeader>

          {/* Form Content */}
          <CardContent className="space-y-5">
            {/* Error Alert */}
            {error && (
              <Alert
                variant="destructive"
                className="border-red-200/50 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20"
              >
                <AlertDescription className="text-red-700 dark:text-red-400 text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email/Username Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="usernameOrEmail"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Email or Username
                </Label>
                <Input
                  id="usernameOrEmail"
                  type="text"
                  placeholder="you@company.com"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-10 rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-10 rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 pr-10 focus:border-indigo-500 focus:ring-indigo-500/20 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-4.753 4.753m7.538-1.894a3.375 3.375 0 01-4.753 4.753M3 3l6.364 6.364m0 0L21 21"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Footer Links */}
            <div className="pt-3 text-center space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Don&apos;t have an account?{' '}
                <a
                  href="/signup"
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
                >
                  Request access
                </a>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                <a
                  href={`${
                    typeof window !== 'undefined' &&
                    window.location.hostname.includes('localhost')
                      ? 'http://localhost:3000'
                      : 'https://avariq.in'
                  }/login`}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  Use a different workspace
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
