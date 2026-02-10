'use client'

import { useState } from 'react'
import { loginUser } from '@/app/actions/user-auth'
import { initiateSignup } from '@/app/actions/signup'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Mail, Eye, EyeOff, Box, Building2, User, ArrowUpRight } from 'lucide-react'

export default function LoginPage() {
  const [loginError, setLoginError] = useState<string | null>(null)
  const [signupError, setSignupError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [signupLoading, setSignupLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'enterprise'>('free')
  const router = useRouter()
  const [provisioningStatus, setProvisioningStatus] = useState<string>('')

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

  async function handleSignup(formData: FormData) {
    setSignupError(null)
    setSignupLoading(true)

    try {
      const password = formData.get('password') as string
      const confirmPassword = formData.get('confirmPassword') as string

      if (password !== confirmPassword) {
        setSignupError('Passwords do not match')
        setSignupLoading(false)
        return
      }

      setProvisioningStatus('Initiating account setup...')
      const result = await initiateSignup(formData)

      if (result && !result.success) {
        setSignupError(result.error || 'Failed to initiate signup')
        setProvisioningStatus('')
        setSignupLoading(false)
      }
    } catch (error: any) {
      if (error.message === 'NEXT_REDIRECT') {
        throw error
      }
      setSignupError(error.message || 'An error occurred during signup')
      setProvisioningStatus('')
      setSignupLoading(false)
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
            Command your entire operation.
          </h1>
          <p className="text-neutral-400 text-lg font-light max-w-md leading-relaxed mb-10">
            Securely access your pipeline, manage assets, and optimize revenue with AI-driven insights.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-md">
            <div className="p-4 border border-white/10 bg-[#0A0A0A]/50 backdrop-blur-sm">
              <div className="text-2xl font-mono text-white mb-1">10K+</div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Active Users</div>
            </div>
            <div className="p-4 border border-white/10 bg-[#0A0A0A]/50 backdrop-blur-sm">
              <div className="text-2xl font-mono text-white mb-1">99.9%</div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Uptime</div>
            </div>
            <div className="p-4 border border-white/10 bg-[#0A0A0A]/50 backdrop-blur-sm">
              <div className="text-2xl font-mono text-white mb-1">₹1B+</div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Revenue Tracked</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-neutral-600 text-xs font-mono">
          © 2026 Avariq
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-[#0A0A0A]">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/5 border border-white/10 flex items-center justify-center">
                <Box className="w-[18px] h-[18px] text-white" />
              </div>
              <span className="font-bold tracking-tight text-lg text-white">
                nexus<span className="text-white/20">erp</span>
              </span>
            </Link>
          </div>

          {/* Login Form */}
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-semibold text-white tracking-tight mb-2">Welcome back</h2>
              <p className="text-neutral-500 text-sm">Enter your credentials to access the system.</p>
            </div>

            <form action={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Email or Username</Label>
                <Input
                  id="login-email"
                  name="email"
                  type="text"
                  placeholder="name@company.com"
                  required
                  className="w-full bg-[#111] border-white/10 text-white placeholder:text-neutral-600 py-6 rounded-none focus:border-orange-500 focus:ring-orange-500/20 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full bg-[#111] border-white/10 text-white placeholder:text-neutral-600 pr-10 py-6 rounded-none focus:border-orange-500 focus:ring-orange-500/20 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded-none border-white/10 bg-[#111] text-orange-500 focus:ring-orange-500/20 focus:ring-offset-0"
                  />
                  <span className="text-xs text-neutral-500">Remember me</span>
                </label>
                <button type="button" className="text-xs text-orange-500 hover:text-orange-400 font-mono transition-colors">
                  Forgot password?
                </button>
              </div>

              {loginError && (
                <div className="text-xs text-red-400 font-mono bg-red-500/10 p-3 border border-red-500/20">
                  {loginError}
                </div>
              )}

              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-white hover:bg-neutral-200 text-black py-6 rounded-none font-semibold tracking-tight transition-colors disabled:opacity-50"
              >
                {loginLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                    Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign In
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/5" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                  <span className="bg-[#0A0A0A] px-3 text-neutral-600 font-mono">Or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => signIn('google')}
                className="w-full bg-[#111] border-white/10 text-white py-6 rounded-none font-medium hover:bg-white/5 transition-colors"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
                </svg>
                Continue with Google
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-[10px] text-neutral-600 text-center font-mono uppercase tracking-wider">
              © 2026 Avariq • SOC-2 Compliant
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


