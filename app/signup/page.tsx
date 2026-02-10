'use client'

import { useState } from 'react'
import { initiateSignup } from '@/app/actions/signup'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { Building2, Mail, Lock, Box, Loader2, User, ArrowUpRight } from 'lucide-react'

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
    <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-[#050505] p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-orange-500/50 transition-colors duration-500">
              <Box className="w-[18px] h-[18px] text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg text-white">
              nexus<span className="text-white/20">erp</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-[#0A0A0A] border border-white/10 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">Create your workspace</h1>
            <p className="text-sm text-neutral-500">
              Get started with your own instance in minutes
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-xs text-red-400 font-mono bg-red-500/10 p-3 border border-red-500/20">
                {error}
              </div>
            )}

            <input type="hidden" name="plan" value="Free" />

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Full Name</Label>
              <div className="relative">
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="John Doe"
                  required
                  disabled={isLoading}
                  className="w-full bg-[#111] border-white/10 text-white placeholder:text-neutral-600 pr-10 py-5 rounded-none focus:border-orange-500 focus:ring-orange-500/20"
                />
                <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-600" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationName" className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Organization</Label>
              <div className="relative">
                <Input
                  id="organizationName"
                  name="organizationName"
                  placeholder="Acme Corporation"
                  required
                  disabled={isLoading}
                  className="w-full bg-[#111] border-white/10 text-white placeholder:text-neutral-600 pr-10 py-5 rounded-none focus:border-orange-500 focus:ring-orange-500/20"
                />
                <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-600" />
              </div>
              <p className="text-[10px] text-neutral-600 font-mono">Your subdomain will be generated from this name</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Admin Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@acmecorp.com"
                  required
                  disabled={isLoading}
                  className="w-full bg-[#111] border-white/10 text-white placeholder:text-neutral-600 pr-10 py-5 rounded-none focus:border-orange-500 focus:ring-orange-500/20"
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-600" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  minLength={8}
                  className="w-full bg-[#111] border-white/10 text-white placeholder:text-neutral-600 pr-10 py-5 rounded-none focus:border-orange-500 focus:ring-orange-500/20"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-600" />
              </div>
              <p className="text-[10px] text-neutral-600 font-mono">At least 8 characters</p>
            </div>

            <Button
              type="submit"
              className="w-full bg-white hover:bg-neutral-200 text-black py-6 rounded-none font-semibold tracking-tight transition-colors disabled:opacity-50"
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
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/5" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                <span className="bg-[#0A0A0A] px-3 text-neutral-600 font-mono">Or</span>
              </div>
            </div>

            <Button
              variant="outline"
              type="button"
              className="w-full bg-[#111] border-white/10 text-white py-5 rounded-none font-medium hover:bg-white/5 transition-colors"
              onClick={() => signIn('google')}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
              </svg>
              Sign up with Google
            </Button>

            <div className="text-center text-xs text-neutral-500 font-mono mt-4">
              Already have an account?{' '}
              <Link href="/login" className="text-orange-500 hover:text-orange-400 transition-colors">
                Sign in
              </Link>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-[10px] text-neutral-600 font-mono uppercase tracking-wider">
            © 2026 Avariq • SOC-2 Compliant
          </p>
        </div>
      </div>
    </div>
  )
}
