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

  async function handleInvite(formData: FormData) {
    setLoading(true)
    setError(null)

    try {
      const email = formData.get('email') as string
      const fullName = formData.get('fullName') as string
      const role = formData.get('role') as string

      // Validate
      if (!email || !fullName || !role) {
        setError('All fields are required')
        return
      }

      if (!email.includes('@')) {
        setError('Invalid email address')
        return
      }

      const result = await inviteTeamMember({
        email,
        fullName,
        role,
      })

      if (result.success) {
        setOpen(false)
        // Reset form
        const form = document.getElementById('invite-form') as HTMLFormElement
        form?.reset()
        // Reload team members list
        window.location.reload()
      } else {
        setError(result.error || 'Failed to invite team member')
        
        // Show upgrade prompt if limit reached
        if (result.limitReached) {
          const upgrade = confirm(`${result.error}\n\nWould you like to upgrade your plan?`)
          if (upgrade) {
            window.location.href = '/settings?tab=billing'
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="bg-primary hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-all shadow-sm hover:shadow-md whitespace-nowrap text-sm">
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Invite Member
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
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
              <Input
                id="fullName"
                name="fullName"
                placeholder="John Doe"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                required
              />
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
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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
      </DialogContent>
    </Dialog>
  )
}
