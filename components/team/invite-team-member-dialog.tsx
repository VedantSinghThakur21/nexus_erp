'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { inviteTeamMember } from '@/app/actions/team'

export function InviteTeamMemberDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invited, setInvited] = useState<{ email: string; tempPassword: string } | null>(null)
  const [copied, setCopied] = useState(false)

  function handleClose() {
    setOpen(false)
    setInvited(null)
    setError(null)
    setCopied(false)
    if (invited) window.location.reload()
  }

  function copyPassword(password: string) {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleInvite(formData: FormData) {
    setLoading(true)
    setError(null)

    try {
      const email = formData.get('email') as string
      const fullName = formData.get('fullName') as string
      const role = formData.get('role') as string

      if (!email || !fullName || !role) {
        setError('All fields are required')
        return
      }

      if (!email.includes('@')) {
        setError('Invalid email address')
        return
      }

      const result = await inviteTeamMember({ email, fullName, role })

      if (result.success) {
        setInvited({ email, tempPassword: result.tempPassword! })
      } else {
        setError(result.error || 'Failed to invite team member')
        if (result.limitReached) {
          const upgrade = confirm(`${result.error}\n\nWould you like to upgrade your plan?`)
          if (upgrade) window.location.href = '/settings?tab=billing'
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
      <DialogTrigger asChild>
        <button className="bg-primary hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-all shadow-sm hover:shadow-md whitespace-nowrap text-sm">
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Invite Member
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        {invited ? (
          /* ── Success state: show temp password ── */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <span className="material-symbols-outlined">check_circle</span>
                Member Added
              </DialogTitle>
              <DialogDescription>
                <strong>{invited.email}</strong> has been added to your organization.
                An invitation email with login instructions has been sent to them.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">key</span>
                  Temporary Password
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  An invitation email has been sent. Share this password as a backup in case they
                  don&apos;t receive it. They can change it after their first login.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-card dark:bg-background border border-amber-200 dark:border-amber-700 rounded px-3 py-2 text-sm font-mono tracking-wider select-all">
                    {invited.tempPassword}
                  </code>
                  <button
                    onClick={() => copyPassword(invited.tempPassword)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-amber-300 dark:border-amber-700 bg-card dark:bg-slate-800 text-amber-800 dark:text-amber-300 hover:bg-amber-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copied ? 'check' : 'content_copy'}
                    </span>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-xs text-muted-foreground  space-y-1">
                <div><strong>Login URL:</strong> {typeof window !== 'undefined' ? window.location.origin + '/login' : 'Your site URL'}</div>
                <div><strong>Email:</strong> {invited.email}</div>
              </div>
            </div>

            <DialogFooter>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors"
              >
                Done
              </button>
            </DialogFooter>
          </>
        ) : (
          /* ── Invite form ── */
          <form id="invite-form" action={handleInvite}>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your organization. They'll receive an email with setup instructions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" name="fullName" placeholder="John Doe" required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" name="email" type="email" placeholder="john@example.com" required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select name="role" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="projects">Projects Manager</SelectItem>
                    <SelectItem value="accounts">Accounts</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Admins can manage team members and billing. Members have standard access.
                </p>
              </div>
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-slate-700  border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Sending...' : 'Send Invitation'}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
