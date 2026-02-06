"use client";

import { useState, useEffect, useMemo } from "react";
import { getTeamMembers, removeTeamMember } from "@/app/actions/team";
import Link from "next/link";

interface TeamMember {
  name: string;
  email: string;
  first_name: string;
  last_name?: string;
  enabled: number;
  creation: string;
  last_login?: string;
  user_type: string;
}

export default function TeamPage() {
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

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-navy-deep border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50 gap-6">
        <div className="flex-1 min-w-0 max-w-2xl">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] group-focus-within:text-primary transition-colors">
              search
            </span>
            <input
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 dark:text-white placeholder:text-slate-400 transition-all shadow-sm"
              placeholder="Ask AI anything..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <Link href="/team/invite">
            <button className="bg-primary hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-all shadow-sm hover:shadow-md whitespace-nowrap text-sm">
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Invite Team Member
            </button>
          </Link>
          <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 relative">
            <span className="material-symbols-outlined text-[24px]">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white dark:border-navy-deep rounded-full"></span>
          </button>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Alex Thompson
              </p>
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">
                Sales Admin
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0">
              AT
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 max-w-[1920px] mx-auto w-full space-y-8">
          {!loading ? (
            <>
              {/* Page Title */}
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Team Members
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
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
                  <button className="bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors shadow-sm">
                    Ask AI: Review permission risks
                  </button>
                </div>
              </div>

              {/* Team Members List */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                      Active Team Members ({filteredMembers.length})
                    </h2>
                    <p className="text-sm text-slate-500">
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
                      <p className="text-slate-500 dark:text-slate-400 mb-4">
                        No team members found matching your search.
                      </p>
                    </div>
                  ) : (
                    filteredMembers.map((member) => {
                      const aiInsight = getAIInsight(member);
                      const isAdmin = member.user_type === "System User";
                      const isProtected =
                        member.email === "Administrator" ||
                        member.email === "administrator@example.com";

                      return (
                        <div
                          key={member.email}
                          className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-base font-bold text-primary">
                                  {member.first_name} {member.last_name || ""}
                                </span>
                                {isAdmin && (
                                  <span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded-full uppercase tracking-wide">
                                    Admin
                                  </span>
                                )}
                                {!isAdmin && (
                                  <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded-full uppercase tracking-wide">
                                    Member
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
                              <div className="flex items-center gap-8 text-sm text-slate-500">
                                <span className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">
                                    mail
                                  </span>
                                  {member.email}
                                </span>
                                <span
                                  className={`flex items-center gap-2 ${
                                    !member.last_login
                                      ? "text-amber-600 font-medium"
                                      : ""
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    history
                                  </span>
                                  Last login: {formatDate(member.last_login)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <button className="text-slate-600 dark:text-slate-400 hover:text-primary transition-colors flex items-center gap-2 text-sm font-semibold">
                                <span className="material-symbols-outlined text-[20px]">
                                  admin_panel_settings
                                </span>
                                Edit Permissions
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
                                  <span className="material-symbols-outlined text-[20px]">
                                    person_remove
                                  </span>
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
              <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="max-w-3xl">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Team Member Limits
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
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
              <div className="text-slate-500">Loading team members...</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="bg-white dark:bg-navy-deep border-t border-slate-200 dark:border-slate-800 px-8 py-4 flex justify-between items-center mt-auto">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 text-[12px] text-emerald-500 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              AI Engine Online
            </span>
            <span className="text-[12px] text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-6">
              Global Sync Interval: 120s
            </span>
            <span className="text-[12px] text-slate-400">Last sync: 2 minutes ago</span>
          </div>
          <div className="text-[12px] text-slate-400 font-medium">AVARIQ v2.4.0-intelligence</div>
        </footer>
      </main>
    </div>
  );
}
