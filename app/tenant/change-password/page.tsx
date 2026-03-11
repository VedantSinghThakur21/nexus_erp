'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Box, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { changePassword } from '@/app/actions/user-auth'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const result = await changePassword(currentPassword, newPassword)
      if (result.success) {
        router.push('/dashboard')
      } else {
        setError(result.error || 'Failed to change password.')
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#050505] p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center">
              <Box className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold tracking-tight text-xl text-white">
              nexus<span className="text-white/20">erp</span>
            </span>
          </div>

          <div className="w-12 h-12 mx-auto mb-4 bg-orange-500/10 border border-orange-500/20 flex items-center justify-center rounded-full">
            <ShieldCheck className="w-6 h-6 text-orange-400" />
          </div>

          <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">
            Set your password
          </h2>
          <p className="text-neutral-500 text-sm max-w-sm mx-auto">
            You&apos;re using a temporary password. Please create a new secure password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
              Temporary Password
            </Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                placeholder="Enter the password you received"
                className="w-full bg-[#111] border-white/10 text-white placeholder:text-neutral-600 py-6 rounded-none focus:border-orange-500 focus:ring-orange-500/20 transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Create a strong password"
                className="w-full bg-[#111] border-white/10 text-white placeholder:text-neutral-600 py-6 rounded-none focus:border-orange-500 focus:ring-orange-500/20 transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
              Confirm New Password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Confirm your new password"
              className="w-full bg-[#111] border-white/10 text-white placeholder:text-neutral-600 py-6 rounded-none focus:border-orange-500 focus:ring-orange-500/20 transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black hover:bg-neutral-200 py-6 rounded-none font-medium text-sm tracking-wide"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Set New Password'
            )}
          </Button>

          <p className="text-xs text-neutral-600 text-center">
            Password must be at least 8 characters long.
          </p>
        </form>
      </div>
    </div>
  )
}
