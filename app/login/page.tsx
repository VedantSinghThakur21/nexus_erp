'use client'

import { useState } from 'react'
import { loginUser } from '@/app/actions/user-auth'
import { initiateSignup } from '@/app/actions/signup'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Mail, Eye, EyeOff, TrendingUp, Users, DollarSign, BarChart3, Building2, User } from 'lucide-react'

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
        // Redirect to tenant subdomain (full URL) or dashboard (relative URL)
        if (result.userType === 'tenant') {
          // Full URL redirect to tenant subdomain
          window.location.href = result.redirectUrl
        } else {
          // Fallback to relative redirect
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

      // Validate password match
      if (password !== confirmPassword) {
        setSignupError('Passwords do not match')
        setSignupLoading(false)
        return
      }

      // Show provisioning status
      setProvisioningStatus('Initiating account setup...')

      // Call server action
      // initiateSignup will redirect on success, or return an error object
      const result = await initiateSignup(formData)

      if (result && !result.success) {
        setSignupError(result.error || 'Failed to initiate signup')
        setProvisioningStatus('')
        setSignupLoading(false)
      }
    } catch (error: any) {
      // Next.js Redirects throw an error, so we need to catch it
      if (error.message === 'NEXT_REDIRECT') {
        throw error
      }
      setSignupError(error.message || 'An error occurred during signup')
      setProvisioningStatus('')
      setSignupLoading(false)
    }
  }

  return (
    <div suppressHydrationWarning className="flex h-screen w-full bg-[#0f0f0f]">
      {/* Left Panel - Branding */}
      <div suppressHydrationWarning className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background Pattern - Timeless Night style */}
        <div suppressHydrationWarning className="absolute inset-0 opacity-5">
          <div suppressHydrationWarning className="absolute top-0 left-0 w-96 h-96 bg-blue-600 rounded-full filter blur-3xl"></div>
          <div suppressHydrationWarning className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl"></div>
        </div>

        <div suppressHydrationWarning className="relative z-10">
          <div suppressHydrationWarning className="flex items-center gap-3 mb-8">
            <div suppressHydrationWarning className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Nexus ERP</span>
          </div>

          <div className="mt-16">
            <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
              Powering ₹1B+ in<br />closed deals globally.
            </h1>
            <p className="text-lg text-slate-400 mb-12 max-w-md">
              Securely access your pipeline, manage leads, and close deals faster with our AI-driven insights.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-6 mb-12">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-5 w-5 text-blue-400" />
                  <span className="text-2xl font-bold text-white">10K+</span>
                </div>
                <p className="text-sm text-slate-400">Active Users</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  <span className="text-2xl font-bold text-white">₹1B+</span>
                </div>
                <p className="text-sm text-slate-400">Revenue Tracked</p>
              </div>
            </div>

            {/* Testimonial */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=John"
                  alt="User"
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <p className="text-white mb-2">"The most efficient tool we've used."</p>
                  <p className="text-sm text-slate-400">Head of Sales, TechCorp</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Icons */}
        <div className="relative z-10 flex items-center gap-6">
          <button className="w-12 h-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
            <Mail className="h-5 w-5 text-white" />
          </button>
          <button className="w-12 h-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
            <BarChart3 className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Right Panel - Login/Signup Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#161616]">
        <div className="w-full max-w-md">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-[#1f1f1f] border border-[#262626]">
              <TabsTrigger value="login" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Create Account</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
                <p className="text-slate-400">Enter your details to access your sales pipeline.</p>
              </div>

              <form action={handleLogin} className="space-y-6">
                {/* Email Input */}
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium text-slate-300">Email or Username</Label>
                  <div className="relative">
                    <Input
                      id="login-email"
                      name="email"
                      type="text"
                      placeholder="name@company.com or username"
                      required
                      className="w-full pl-10 bg-[#161b22] border-slate-700 text-white placeholder:text-slate-500 pr-10 py-6 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                    />
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium text-slate-300">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full bg-[#161b22] border-slate-700 text-white placeholder:text-slate-500 pr-10 py-6 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-[#161b22] text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-slate-400">Remember me</span>
                  </label>
                  <button type="button" className="text-sm text-blue-500 hover:text-blue-400">
                    Forgot password?
                  </button>
                </div>

                {loginError && (
                  <div className="text-sm text-red-400 font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    {loginError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loginLoading ? 'Signing in...' : 'Sign in'}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#161616] px-2 text-slate-500">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => signIn('google')}
                  className="w-full bg-[#161b22] border-slate-700 text-white py-6 rounded-lg font-medium hover:bg-slate-800 transition-colors"
                >
                  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                    <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                  </svg>
                  Google
                </Button>
              </form>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Create your account</h2>
                <p className="text-slate-400">Start your 14-day free trial, no credit card required.</p>
                <div className="mt-3 text-sm text-amber-400/80 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                  ⏱️ Account setup takes ~3 minutes. Please don't close this page.
                </div>
              </div>

              <form action={handleSignup} className="space-y-6">
                {/* Full Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium text-slate-300">Full Name</Label>
                  <div className="relative">
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      placeholder="John Doe"
                      required
                      className="w-full bg-[#161b22] border-slate-700 text-white placeholder:text-slate-500 pr-10 py-6 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                    />
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  </div>
                </div>

                {/* Email Input */}
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium text-slate-300">Email address</Label>
                  <div className="relative">
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="name@company.com"
                      required
                      className="w-full bg-[#161b22] border-slate-700 text-white placeholder:text-slate-500 pr-10 py-6 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                    />
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  </div>
                </div>

                {/* Organization Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="organizationName" className="text-sm font-medium text-slate-300">Organization Name</Label>
                  <div className="relative">
                    <Input
                      id="organizationName"
                      name="organizationName"
                      type="text"
                      placeholder="Acme Corp"
                      required
                      className="w-full bg-[#161b22] border-slate-700 text-white placeholder:text-slate-500 pr-10 py-6 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                    />
                    <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  </div>
                </div>

                {/* Subscription Plan Selection */}
                <div className="space-y-2">
                  <Label htmlFor="plan" className="text-sm font-medium text-slate-300">Subscription Plan</Label>
                  <Select value={selectedPlan} onValueChange={(value: any) => setSelectedPlan(value)}>
                    <SelectTrigger className="w-full bg-[#161b22] border-slate-700 text-white py-6 rounded-lg focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0d1117] border-slate-700">
                      <SelectItem value="free" className="text-white hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">
                        <div className="flex items-center justify-between w-full py-2">
                          <div className="flex flex-col items-start">
                            <span className="font-semibold text-base">Free Plan</span>
                            <span className="text-xs text-slate-400">₹0/month • 2 users • 50 leads</span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="pro" className="text-white hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">
                        <div className="flex items-center justify-between w-full py-2">
                          <div className="flex flex-col items-start">
                            <span className="font-semibold text-base">Professional</span>
                            <span className="text-xs text-slate-400">₹2,999/month • 10 users • 1000 leads</span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="enterprise" className="text-white hover:bg-slate-800 focus:bg-slate-800 cursor-pointer">
                        <div className="flex items-center justify-between w-full py-2">
                          <div className="flex flex-col items-start">
                            <span className="font-semibold text-base">Enterprise</span>
                            <span className="text-xs text-slate-400">₹9,999/month • Unlimited</span>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400">
                    Start with 14-day free trial. No credit card required.
                  </p>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium text-slate-300">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      className="w-full bg-[#161b22] border-slate-700 text-white placeholder:text-slate-500 pr-10 py-6 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Must be at least 8 characters with uppercase, lowercase, number, and special character (!@#$%^&*)
                  </p>
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={8}
                      className="w-full bg-[#161b22] border-slate-700 text-white placeholder:text-slate-500 pr-10 py-6 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {signupError && (
                  <div className="text-sm text-red-400 font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    {signupError}
                  </div>
                )}

                {provisioningStatus && !signupError && (
                  <div className="text-sm text-blue-400 font-medium bg-blue-500/10 p-4 rounded-lg border border-blue-500/20 flex items-center gap-3">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                    <span>{provisioningStatus}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {signupLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Creating workspace...
                    </span>
                  ) : 'Create Account'}
                </Button>

                <p className="text-xs text-slate-500 text-center">
                  By creating an account, you agree to our{' '}
                  <button type="button" className="text-blue-500 hover:text-blue-400">Terms of Service</button>
                  {' '}and{' '}
                  <button type="button" className="text-blue-500 hover:text-blue-400">Privacy Policy</button>
                </p>
              </form>
            </TabsContent>
          </Tabs>

          {/* Footer Text */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-xs text-slate-500 text-center">
              © 2024 Nexus ERP. All rights reserved. • Privacy • Terms
            </p>
          </div>
        </div>
      </div>
    </div >
  )
}

