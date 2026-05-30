'use client'

import { useMemo, useState } from 'react'
import { getTeamMembers, removeTeamMember } from '@/app/actions/team'
import { InviteTeamMemberDialog } from '@/components/team/invite-team-member-dialog'
import { EditPermissionsDialog } from '@/components/team/edit-permissions-dialog'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { useUser } from '@/contexts/user-context'
import { teamMemberAiInsight } from '@/lib/ai/document-insights'

type TeamMember = Awaited<ReturnType<typeof getTeamMembers>>[number] & {
  primary_role?: string
  actual_roles?: string[]
  modules_count?: number
  has_broken_roles?: boolean
}

function getRoleBadgeLabel(member: TeamMember): string {
  const role = member.primary_role || (member as any).role_profile_name
  if (!role) return 'Member'
  if (role === 'System Manager' || role === 'Administrator') return 'Admin'
  return String(role).replace(' Manager', ' Mgr').replace(' User', '')
}

export function TeamClient(props: { initialTeamMembers: TeamMember[] }) {
  const { canAccess, loading: rolesLoading } = useUser()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(props.initialTeamMembers)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)

  async function loadTeamMembers() {
    setLoading(true)
    try {
      const data = await getTeamMembers()
      setTeamMembers(data as TeamMember[])
    } catch (error) {
      console.error('Failed to load team members:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveMember(email: string, name: string) {
    if (!confirm(`Are you sure you want to remove ${name} from the team?`)) {
      return
    }

    setRemovingEmail(email)
    try {
      const result = await removeTeamMember(email)
      if (result.success) {
        await loadTeamMembers()
      } else {
        alert(result.error || 'Failed to remove team member')
      }
    } catch (error) {
      console.error('Error removing team member:', error)
      alert('Failed to remove team member')
    } finally {
      setRemovingEmail(null)
    }
  }

  function formatDate(dateString?: string) {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  function getDaysSinceLogin(lastLogin?: string): number | null {
    if (!lastLogin) return null
    const lastLoginDate = new Date(lastLogin)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - lastLoginDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getAIInsight = teamMemberAiInsight

  const filteredMembers = useMemo(() => {
    return teamMembers.filter((member) => {
      const matchesSearch =
        searchQuery === '' ||
        member.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesSearch
    })
  }, [teamMembers, searchQuery])

  const kpis = useMemo(() => {
    const totalUsers = teamMembers.length
    const activeToday = teamMembers.filter((member) => {
      const daysSinceLogin = getDaysSinceLogin(member.last_login)
      return daysSinceLogin !== null && daysSinceLogin <= 1
    }).length

    const pendingInvites = 0

    const activeMembers = teamMembers.filter((m) => m.last_login && (getDaysSinceLogin(m.last_login) ?? 999) <= 30)
    const productivityScore = totalUsers > 0 ? Math.round((activeMembers.length / totalUsers) * 100) : 0

    return {
      totalUsers,
      activeToday,
      pendingInvites,
      productivityScore: `${productivityScore}%`,
    }
  }, [teamMembers])

  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null)
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false)

  async function handleEditPermissions(member: TeamMember) {
    setSelectedUser(member)
    setIsPermissionsDialogOpen(true)
  }

  return (
    <div className="app-shell flex flex-col">
      <PageHeader searchQuery={searchQuery} onSearchChange={setSearchQuery}>
        <InviteTeamMemberDialog />
      </PageHeader>

      {!rolesLoading && !canAccess('team') && (
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <span className="material-symbols-outlined text-[48px] text-slate-300">lock</span>
            <p className="text-muted-foreground font-medium">You don&apos;t have permission to manage the team.</p>
            <p className="text-slate-400 text-sm">This page is restricted to System Administrators.</p>
            <Link href="/dashboard" className="inline-block mt-2 text-sm font-semibold text-primary hover:underline">
              Back to Dashboard
            </Link>
          </div>
        </main>
      )}

      {rolesLoading || !canAccess('team') ? null : (
        <>
          <EditPermissionsDialog
            isOpen={isPermissionsDialogOpen}
            onClose={() => setIsPermissionsDialogOpen(false)}
            user={
              selectedUser
                ? {
                    name: selectedUser.email,
                    full_name: `${selectedUser.first_name} ${selectedUser.last_name || ''}`,
                    roles: [],
                  }
                : null
            }
            onSave={() => {
              void loadTeamMembers()
            }}
          />

          <main className="app-content flex-1">
            <div className="app-container w-full space-y-8">
              {!loading ? (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Team Members</h2>
                      <p className="text-sm text-muted-foreground ">
                        Manage your organization team members and their access with AI insights
                      </p>
                    </div>
                    <button
                      onClick={() => void loadTeamMembers()}
                      className="px-4 py-2 rounded-lg border border-border bg-background text-sm font-semibold hover:bg-muted transition"
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="relative rounded-xl border border-border bg-card p-6 shadow-none">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Users</p>
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                          <span className="material-symbols-outlined text-blue-400 text-2xl">group</span>
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-foreground">{kpis.totalUsers}</p>
                    </div>

                    <div className="relative rounded-xl border border-border bg-card p-6 shadow-none">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Today</p>
                        <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                          <span className="material-symbols-outlined text-green-400 text-2xl">check_circle</span>
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-foreground">{kpis.activeToday}</p>
                    </div>

                    <div className="relative rounded-xl border border-border bg-card p-6 shadow-none">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Invites</p>
                        <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                          <span className="material-symbols-outlined text-orange-400 text-2xl">pending_actions</span>
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-foreground">{kpis.pendingInvites}</p>
                    </div>

                    <div className="relative rounded-xl border border-border bg-card p-6 shadow-none">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Productivity Score</p>
                        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                          <span className="material-symbols-outlined text-purple-400 text-2xl">trending_up</span>
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-foreground">{kpis.productivityScore}</p>
                    </div>
                  </div>

                  <div className="bg-card dark:bg-background border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                      <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                          Active Team Members ({filteredMembers.length})
                        </h2>
                        <p className="text-sm text-muted-foreground">All users with active access to the workspace</p>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredMembers.length === 0 ? (
                        <div className="p-12 text-center">
                          <p className="text-muted-foreground  mb-4">No team members found matching your search.</p>
                        </div>
                      ) : (
                        filteredMembers.map((member) => {
                          const aiInsight = getAIInsight(member)
                          const isAdmin = member.primary_role === 'System Manager' || (member as any).role_profile_name === 'Administrator'
                          const roleLabel = getRoleBadgeLabel(member)
                          const isProtected = member.email === 'Administrator' || member.email === 'administrator@example.com'
                          const hasBrokenAccess = !!member.has_broken_roles
                          const modulesCount = member.modules_count ?? 0

                          return (
                            <div
                              key={member.email}
                              className={`p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                                hasBrokenAccess ? 'border-l-2 border-amber-400' : ''
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="text-base font-bold text-primary">
                                      {member.first_name} {member.last_name || ''}
                                    </span>
                                    {hasBrokenAccess ? (
                                      <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded-full uppercase tracking-wide flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]">warning</span>
                                        No Access
                                      </span>
                                    ) : isAdmin ? (
                                      <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded-full uppercase tracking-wide">
                                        {roleLabel}
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600  text-[10px] font-bold rounded-full uppercase tracking-wide">
                                        {roleLabel}
                                      </span>
                                    )}
                                    {!hasBrokenAccess && modulesCount > 0 && (
                                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold rounded-full border border-emerald-100 dark:border-emerald-800">
                                        {modulesCount} module{modulesCount !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                    {aiInsight && (
                                      <span
                                        className={`flex items-center gap-1.5 ${
                                          aiInsight.color === 'purple'
                                            ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800'
                                            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800'
                                        } px-3 py-1 rounded-full text-[11px] font-semibold border`}
                                      >
                                        <span className="material-symbols-outlined text-[14px]">{aiInsight.icon}</span>
                                        {aiInsight.message}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-8 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[18px]">mail</span>
                                      {member.email}
                                    </span>
                                    <span className={`flex items-center gap-2 ${!member.last_login ? 'text-amber-600 font-medium' : ''}`}>
                                      <span className="material-symbols-outlined text-[18px]">history</span>
                                      Last login: {formatDate(member.last_login)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4">
                                  <button
                                    onClick={() => void handleEditPermissions(member)}
                                    className={`transition-colors flex items-center gap-2 text-sm font-semibold ${
                                      hasBrokenAccess
                                        ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700'
                                        : 'text-slate-600  hover:text-primary'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-[20px]">
                                      {hasBrokenAccess ? 'assignment_ind' : 'admin_panel_settings'}
                                    </span>
                                    {hasBrokenAccess ? 'Fix Permissions' : 'Edit Permissions'}
                                  </button>
                                  {!isProtected && (
                                    <button
                                      onClick={() =>
                                        void handleRemoveMember(member.email, `${member.first_name} ${member.last_name || ''}`)
                                      }
                                      disabled={removingEmail === member.email}
                                      className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <span className="material-symbols-outlined text-[20px]">person_remove</span>
                                      {removingEmail === member.email ? 'Removing...' : 'Remove'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">Loading team members...</div>
                </div>
              )}
            </div>
          </main>
        </>
      )}
    </div>
  )
}

