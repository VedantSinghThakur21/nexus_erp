'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { Mail, Eye, EyeOff, TrendingUp, Users, DollarSign, BarChart3 } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6 rounded-lg" type="submit" disabled={pending}>
      {pending ? 'Signing in...' : 'Sign In'}
    </Button>
  )
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setError(null)
    
    const result = await login(null, formData)
    
    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      router.refresh() 
      router.push('/dashboard') 
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

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#0d1117]">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
            <p className="text-slate-400">Enter your details to access your sales pipeline.</p>
          </div>

          <form action={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-300">Email address</Label>
              <div className="relative">
                <Input 
                  id="email" 
                  name="email" 
                  type="text" 
                  placeholder="name@company.com" 
                  required 
                  className="w-full bg-[#161b22] border-slate-700 text-white placeholder:text-slate-500 pr-10 py-6 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-300">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
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
            
            {error && (
              <div className="text-sm text-red-400 font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                {error}
              </div>
            )}

            <SubmitButton />

            {/* Footer */}
            <p className="text-center text-sm text-slate-400">
              Don't have an account?{' '}
              <button type="button" className="text-blue-500 hover:text-blue-400 font-medium">
                Contact Admin
              </button>
            </p>
          </form>

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

