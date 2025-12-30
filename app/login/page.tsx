'use client'

import { useState } from 'react'
import { loginUser, signupUser } from '@/app/actions/user-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter } from 'next/navigation'
import { Mail, Eye, EyeOff, TrendingUp, Users, DollarSign, BarChart3, Building2, User } from 'lucide-react'

export default function LoginPage() {
  const [loginError, setLoginError] = useState<string | null>(null)
  const [signupError, setSignupError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [signupLoading, setSignupLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(formData: FormData) {
    setLoginError(null)
    setLoginLoading(true)
    
    try {
      const email = formData.get('email') as string
      const password = formData.get('password') as string
      
      const result = await loginUser(email, password)
      
      if (result.success) {
        router.push('/dashboard')
      } else {
        setLoginError(result.error || 'Invalid email or password')
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
      const email = formData.get('email') as string
      const password = formData.get('password') as string
      const confirmPassword = formData.get('confirmPassword') as string
      const fullName = formData.get('fullName') as string
      const organizationName = formData.get('organizationName') as string
      
      // Validate password match
      if (password !== confirmPassword) {
        setSignupError('Passwords do not match')
        setSignupLoading(false)
        return
      }
      
      // Validate required fields
      if (!email || !password || !fullName || !organizationName) {
        setSignupError('All fields are required')
        setSignupLoading(false)
        return
      }
      
      const result = await signupUser({
        email,
        password,
        fullName,
        organizationName
      })
      
      if (result.success) {
        // Redirect to onboarding if needed, otherwise dashboard
        if (result.needsOnboarding) {
          router.push('/onboarding')
        } else {
          router.push('/dashboard')
        }
      } else {
        setSignupError(result.error || 'Failed to create account')
      }
    } catch (error) {
      setSignupError('An error occurred during signup')
    } finally {
      setSignupLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full bg-[#0a0e1a]">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#0d1117]">
        <div className="w-full max-w-md">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-[#161b22] border border-slate-700">
              <TabsTrigger value="login" className="data-[state=active]:bg-blue-600">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-blue-600">Create Account</TabsTrigger>
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
                  <Label htmlFor="login-email" className="text-sm font-medium text-slate-300">Email address</Label>
                  <div className="relative">
                    <Input 
                      id="login-email" 
                      name="email" 
                      type="email" 
                      placeholder="name@company.com" 
                      required 
                      className="w-full bg-[#161b22] border-slate-700 text-white placeholder:text-slate-500 pr-10 py-6 rounded-lg focus:border-blue-500 focus:ring-blue-500"
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
              </form>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Create your account</h2>
                <p className="text-slate-400">Start your 14-day free trial, no credit card required.</p>
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

                {/* Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium text-slate-300">Password</Label>
                  <div className="relative">
                    <Input 
                      id="signup-password" 
                      name="password" 
                      type={showPassword ? "text" : "password"}
                      required 
                      minLength={6}
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

                {/* Confirm Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300">Confirm Password</Label>
                  <div className="relative">
                    <Input 
                      id="confirmPassword" 
                      name="confirmPassword" 
                      type={showConfirmPassword ? "text" : "password"}
                      required 
                      minLength={6}
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

                <Button 
                  type="submit" 
                  disabled={signupLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {signupLoading ? 'Creating account...' : 'Create Account'}
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
    </div>
  )
}

