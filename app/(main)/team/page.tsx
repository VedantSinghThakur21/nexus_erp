"use client";

import { useState, useEffect, useMemo } from "react";
import { getTeamMembers, removeTeamMember } from "@/app/actions/team";
import { InviteTeamMemberDialog } from "@/components/team/invite-team-member-dialog";
import { EditPermissionsDialog } from "@/components/team/edit-permissions-dialog";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { useUser } from "@/contexts/user-context";

interface TeamMember {
  name: string;
  email: string;
  first_name: string;
  last_name?: string;
  enabled: number;
  creation: string;
  last_login?: string;
  user_type: string;
  role_profile_name?: string;
  primary_role?: string;
  actual_roles?: string[];
  modules_count?: number;
  has_broken_roles?: boolean;
}

function getRoleBadgeLabel(member: TeamMember): string {
  const role = member.primary_role || member.role_profile_name
  if (!role) return 'Member';
  if (role === 'System Manager' || role === 'Administrator') return 'Admin';
  return role.replace(' Manager', ' Mgr').replace(' User', '');
}

export default function TeamPage() {
  const { canAccess, loading: rolesLoading } = useUser();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  async function loadTeamMembers() {
    setLoading(true);
    try {
      const data = await getTeamMembers();
      setTeamMembers(data);
    } catch (error) {
      console.error("Failed to load team members:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveMember(email: string, name: string) {
    if (!confirm(`Are you sure you want to remove ${name} from the team?`)) {
      return;
    }

    setRemovingEmail(email);
    try {
      const result = await removeTeamMember(email);
      if (result.success) {
        await loadTeamMembers();
      } else {
        alert(result.error || "Failed to remove team member");
      }
    } catch (error) {
      console.error("Error removing team member:", error);
      alert("Failed to remove team member");
    } finally {
      setRemovingEmail(null);
    }
  }

  function formatDate(dateString?: string) {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Calculate days since last login
  function getDaysSinceLogin(lastLogin?: string): number | null {
    if (!lastLogin) return null;
    const lastLoginDate = new Date(lastLogin);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastLoginDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // Get AI insights for team member
  function getAIInsight(member: TeamMember) {
    const daysSinceLogin = getDaysSinceLogin(member.last_login);

    if (!member.last_login) {
      return {
        message: "Inactive for 30 days - consider deactivating",
        color: "amber",
        icon: "report_problem",
      };
    }

    if (daysSinceLogin && daysSinceLogin <= 1) {
      return {
        message: "High Activity - Potential Lead",
        color: "purple",
        icon: "insights",
      };
    }

    if (daysSinceLogin && daysSinceLogin > 30) {
      return {
        message: "Inactive for 30 days - consider deactivating",
        color: "amber",
        icon: "report_problem",
      };
    }

    return null;
  }

  // Filter team members
  const filteredMembers = useMemo(() => {
    return teamMembers.filter((member) => {
      const matchesSearch =
        searchQuery === "" ||
        member.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [teamMembers, searchQuery]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalUsers = teamMembers.length;
    const activeToday = teamMembers.filter((member) => {
      const daysSinceLogin = getDaysSinceLogin(member.last_login);
      return daysSinceLogin !== null && daysSinceLogin <= 1;
    }).length;

    const pendingInvites = 0; // Placeholder - would need invitation tracking

    // Mock AI productivity score calculation
    const activeMembers = teamMembers.filter(
      (m) => m.last_login && getDaysSinceLogin(m.last_login)! <= 30
    );
    const productivityScore = totalUsers > 0 ? Math.round((activeMembers.length / totalUsers) * 100) : 0;

    return {
      totalUsers,
      activeToday,
      pendingInvites,
      productivityScore: `${productivityScore}%`,
    };
  }, [teamMembers]);

  // Permissions dialog state
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);

  async function handleEditPermissions(member: TeamMember) {
    setSelectedUser(member);
    setIsPermissionsDialogOpen(true);
  }

  return (
    <div className="app-shell flex flex-col">
      {/* Header */}
      <PageHeader searchQuery={searchQuery} onSearchChange={setSearchQuery}>
        <InviteTeamMemberDialog />
      </PageHeader>

      {/* Access denied guard */}
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

      {rolesLoading || !canAccess('team') ? null : (<>

      {/* Permissions Dialog */}
      <EditPermissionsDialog
        isOpen={isPermissionsDialogOpen}
        onClose={() => setIsPermissionsDialogOpen(false)}
        user={selectedUser ? {
          name: selectedUser.email,
          full_name: `${selectedUser.first_name} ${selectedUser.last_name || ""}`,
          roles: [] // Will be fetched by dialog
        } : null}
        onSave={() => {
          loadTeamMembers(); // Refresh to reflect any changes if needed
        }}
      />

      {/* Main Content */}
      <main className="app-content flex-1">
        <div className="w-full space-y-8">
          {!loading ? (
            <>
              {/* Page Title */}
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Team Members
                </h2>
                <p className="text-sm text-muted-foreground ">
                  Manage your organization's team members and their access with AI insights
                </p>
              </div>

              {/* KPI Cards - Matching Leads Page Styling */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative group">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Total Users
                    </p>
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-400 text-2xl">
                        group
                      </span>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">{kpis.totalUsers}</p>
                </div>

                <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative group">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Active Today
                    </p>
                    <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-green-400 text-2xl">
                        check_circle
                      </span>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">{kpis.activeToday}</p>
                </div>

                <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative group">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Pending Invites
                    </p>
                    <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-orange-400 text-2xl">
                        pending_actions
                      </span>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">{kpis.pendingInvites}</p>
                </div>

                <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative group">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      AI Productivity Score
                    </p>
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-purple-400 text-2xl">
                        trending_up
                      </span>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">{kpis.productivityScore}</p>
                </div>
              </div>

              {/* AI Intelligence Banner */}
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-5 flex flex-wrap items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <span className="material-symbols-outlined text-white text-2xl">
                      auto_awesome
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-blue-900 dark:text-blue-200">
                      AI Access Intelligence
                    </h3>
                    <p className="text-sm text-blue-700/70 dark:text-blue-400/70">
                      Scanning for inactive users and permission risks across your team.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-end gap-1.5 h-8">
                    <div className="w-1.5 h-3 bg-blue-300 rounded-full"></div>
                    <div className="w-1.5 h-5 bg-blue-400 rounded-full"></div>
                    <div className="w-1.5 h-4 bg-blue-300 rounded-full"></div>
                    <div className="w-1.5 h-7 bg-blue-500 rounded-full"></div>
                    <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
                  </div>
                  <button className="bg-card dark:bg-slate-800 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors shadow-sm">
                    Ask AI: Review permission risks
                  </button>
                </div>
              </div>

              {/* Team Members List */}
              <div className="bg-card dark:bg-background border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                      Active Team Members ({filteredMembers.length})
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      All users with active access to the workspace
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                      <span className="material-symbols-outlined">filter_list</span>
                    </button>
                    <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMembers.length === 0 ? (
                    <div className="p-12 text-center">
                      <p className="text-muted-foreground  mb-4">
                        No team members found matching your search.
                      </p>
                    </div>
                  ) : (
                    filteredMembers.map((member) => {
                      const aiInsight = getAIInsight(member);
                      const isAdmin = member.primary_role === 'System Manager' || member.role_profile_name === 'Administrator';
                      const roleLabel = getRoleBadgeLabel(member);
                      const isProtected =
                        member.email === "Administrator" ||
                        member.email === "administrator@example.com";
                      const hasBrokenAccess = member.has_broken_roles;
                      const modulesCount = member.modules_count ?? 0;

                      return (
                        <div
                          key={member.email}
                          className={`p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${hasBrokenAccess ? 'border-l-2 border-amber-400' : ''}`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-base font-bold text-primary">
                                  {member.first_name} {member.last_name || ""}
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
                                      aiInsight.color === "purple"
                                        ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800"
                                        : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800"
                                    } px-3 py-1 rounded-full text-[11px] font-semibold border`}
                                  >
                                    <span className="material-symbols-outlined text-[14px]">
                                      {aiInsight.icon}
                                    </span>
                                    {aiInsight.message}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-8 text-sm text-muted-foreground">
                                <span className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">mail</span>
                                  {member.email}
                                </span>
                                <span className={`flex items-center gap-2 ${!member.last_login ? 'text-amber-600 font-medium' : ''}` }>
                                  <span className="material-symbols-outlined text-[18px]">history</span>
                                  Last login: {formatDate(member.last_login)}
                                </span>
                                {hasBrokenAccess && (
                                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium text-xs">
                                    <span className="material-symbols-outlined text-[14px]">info</span>
                                    Click &ldquo;Edit Permissions&rdquo; to assign a role
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => handleEditPermissions(member)}
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
                                    handleRemoveMember(
                                      member.email,
                                      `${member.first_name} ${member.last_name || ""}`
                                    )
                                  }
                                  disabled={removingEmail === member.email}
                                  className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <span className="material-symbols-outlined text-[20px]">person_remove</span>
                                  {removingEmail === member.email ? "Removing..." : "Remove"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Team Member Limits */}
              <div className="bg-slate-100 dark:bg-background border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="max-w-3xl">
                    <h4 className="text-sm font-bold text-slate-800 ">
                      Team Member Limits
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your current plan allows for 10 team members. You have used{" "}
                      {teamMembers.length} of your slots. Upgrade your plan to add more users
                      to your organization and unlock advanced permission controls.
                    </p>
                  </div>
                  <a
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline group"
                    href="#"
                  >
                    Upgrade Plan
                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </a>
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
      </>)}
    </div>
  );
}
