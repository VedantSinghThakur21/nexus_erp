'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Box, Eye, EyeOff } from 'lucide-react'
import { useClientTenant } from '@/lib/tenant-client'
import { loginUser } from '@/app/actions/user-auth'
import Link from 'next/link'

/**
 * Tenant-specific login page (tesla.avariq.in/login)
 * Dark theme matching main login page with split layout
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
    <div suppressHydrationWarning className="flex min-h-screen w-full bg-[#050505]">
      {/* Left Panel - Branding */}
      <div suppressHydrationWarning className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden border-r border-white/5">
        {/* Background Effects */}
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-orange-500/50 transition-colors duration-500">
              <Box className="w-[18px] h-[18px] text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg text-white">
              nexus<span className="text-white/20">erp</span>
            </span>
          </Link>
        </div>

        {/* Center Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h1 className="font-sans font-semibold text-5xl xl:text-6xl tracking-tighter leading-[0.95] text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-neutral-600 mb-6 max-w-lg">
            Access your workspace.
          </h1>
          <p className="text-neutral-400 text-lg font-light max-w-md leading-relaxed mb-10">
            Manage your operations, track projects, and collaborate with your team seamlessly.
          </p>

          {/* Workspace Info */}
          {tenant && (
            <div className="p-4 border border-white/10 bg-[#0A0A0A]/50 backdrop-blur-sm max-w-md">
              <div className="text-sm text-neutral-400 uppercase tracking-wider mb-2">Workspace</div>
              <div className="text-xl font-mono text-white">{tenant}.avariq.in</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 text-neutral-600 text-xs font-mono">
          © 2026 Avariq
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-[#0A0A0A]">
        <div className="w-full max-w-md">
          {/* Mobile Logo & Workspace */}
          <div className="lg:hidden flex flex-col items-center mb-8 gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/5 border border-white/10 flex items-center justify-center">
                <Box className="w-[18px] h-[18px] text-white" />
              </div>
              <span className="font-bold tracking-tight text-lg text-white">
                nexus<span className="text-white/20">erp</span>
              </span>
            </Link>
            {tenant && (
              <div className="text-center">
                <div className="text-xs text-neutral-500 uppercase tracking-wider">Workspace</div>
                <div className="text-sm font-mono text-neutral-300">{tenant}.avariq.in</div>
              </div>
            )}
          </div>

          {/* Login Form */}
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-semibold text-white tracking-tight mb-2">Sign in</h2>
              <p className="text-neutral-500 text-sm">Enter your credentials to access your workspace.</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email/Username Field */}
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Email or Username</Label>
                <Input
                  id="login-email"
                  type="text"
                  placeholder="you@company.com"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full bg-[#111] border-white/10 text-white placeholder:text-neutral-600 py-6 rounded-none focus:border-orange-500 focus:ring-orange-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full bg-[#111] border-white/10 text-white placeholder:text-neutral-600 pr-10 py-6 rounded-none focus:border-orange-500 focus:ring-orange-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 mt-6 bg-white text-black hover:bg-gray-100 font-semibold rounded-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

            {/* Divider */}
            <div className="my-8 flex items-center gap-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-neutral-600">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Back to Main Login */}
            <div className="text-center">
              <p className="text-sm text-neutral-500 mb-3">Need to access a different workspace?</p>
              <Link href="/login" className="text-sm text-orange-500 hover:text-orange-400 font-medium transition-colors">
                Go to main login →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
