'use client'

import { useMemo, useState, useCallback } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import Link from 'next/link'
import { removeTeamMember } from '@/app/actions/team'
import { InviteTeamMemberDialog } from '@/components/team/invite-team-member-dialog'
import { EditPermissionsDialog } from '@/components/team/edit-permissions-dialog'
import { PageHeader } from '@/components/page-header'
import { useUser } from '@/contexts/user-context'
import { useToast } from '@/components/ui/toast'
import type { TeamMemberRow } from '@/app/actions/team-data'
import { TeamMemberRowMemo } from './team-member-row'

export function TeamPageClient({
  initialMembers,
  planName,
}: {
  initialMembers: TeamMemberRow[]
  planName: string
}) {
  const { canAccess, loading: rolesLoading } = useUser()
  const { addToast } = useToast()
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [members, setMembers] = useState(initialMembers)
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<TeamMemberRow | null>(null)
  const [permissionsOpen, setPermissionsOpen] = useState(false)

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearchQuery(value)
  }, 300)

  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.first_name?.toLowerCase().includes(q) ||
        m.last_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q)
    )
  }, [members, searchQuery])

  const refreshMembers = useCallback(async () => {
    const res = await fetch('/api/team/members')
    if (!res.ok) return
    const data = (await res.json()) as { members: TeamMemberRow[] }
    setMembers(data.members)
  }, [])

  const handleRemove = useCallback(
    async (email: string, name: string) => {
      if (!confirm(`Remove ${name} from the team?`)) return
      const prev = members
      setMembers((list) => list.filter((m) => m.email !== email))
      setRemovingEmail(email)
      try {
        const result = await removeTeamMember(email)
        if (!result.success) {
          setMembers(prev)
          addToast({ type: 'error', title: result.error || 'Failed to remove member' })
        }
      } catch {
        setMembers(prev)
        addToast({ type: 'error', title: 'Failed to remove member' })
      } finally {
        setRemovingEmail(null)
      }
    },
    [members, addToast]
  )

  const kpis = useMemo(() => {
    const total = members.length
    const activeToday = members.filter((m) => {
      if (!m.last_login) return false
      const days = Math.ceil(Math.abs(Date.now() - new Date(m.last_login).getTime()) / 86400000)
      return days <= 1
    }).length
    return { total, activeToday }
  }, [members])

  return (
    <div className="app-shell flex flex-col">
      <PageHeader
        searchQuery={searchInput}
        onSearchChange={(v) => {
          setSearchInput(v)
          debouncedSearch(v)
        }}
      >
        <InviteTeamMemberDialog />
      </PageHeader>

      {!rolesLoading && !canAccess('team') && (
        <main className="flex flex-1 items-center justify-center p-8">
          <p className="text-muted-foreground">You don&apos;t have permission to manage the team.</p>
          <Link href="/dashboard" className="ml-2 text-primary hover:underline">
            Dashboard
          </Link>
        </main>
      )}

      {rolesLoading || !canAccess('team') ? null : (
        <main className="app-content flex-1">
          <div className="app-container w-full space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Team Members</h2>
              <p className="text-sm text-muted-foreground">Plan: {planName}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Kpi label="Total" value={String(kpis.total)} />
              <Kpi label="Active today" value={String(kpis.activeToday)} />
            </div>

            <EditPermissionsDialog
              isOpen={permissionsOpen}
              onClose={() => setPermissionsOpen(false)}
              user={
                selectedUser
                  ? {
                      name: selectedUser.email,
                      full_name: `${selectedUser.first_name} ${selectedUser.last_name || ''}`,
                    }
                  : null
              }
              onSave={() => void refreshMembers()}
            />

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border p-4">
                <h3 className="font-semibold">Active members ({filteredMembers.length})</h3>
              </div>
              {filteredMembers.map((member) => (
                <TeamMemberRowMemo
                  key={member.email}
                  member={member}
                  removingEmail={removingEmail}
                  onEdit={(m) => {
                    setSelectedUser(m)
                    setPermissionsOpen(true)
                  }}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </div>
        </main>
      )}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  )
}
