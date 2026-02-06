"use client";

import { useState, useEffect, useMemo } from "react";
import { getOperators } from "@/app/actions/operators";
import type { Operator } from "@/app/actions/operators";
import Link from "next/link";

export default function OperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("Availability Status");

  useEffect(() => {
    loadOperators();
  }, []);

  async function loadOperators() {
    setLoading(true);
    try {
      const data = await getOperators();
      setOperators(data);
    } catch (error) {
      console.error("Failed to load operators:", error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate KPIs
  const kpis = useMemo(() => {
    const total = operators.length;
    const onField = operators.filter((op) => op.status === "Active").length;
    const utilization = total > 0 ? Math.round((onField / total) * 100) : 0;

    return {
      total,
      onField,
      utilization: `${utilization}%`,
      aiScore: "N/A",
    };
  }, [operators]);

  // Filter operators
  const filteredOperators = useMemo(() => {
    return operators.filter((operator) => {
      const matchesSearch =
        searchTerm === "" ||
        operator.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        operator.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        operator.bio?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole =
        roleFilter === "All Roles" || operator.designation === roleFilter;

      const matchesStatus =
        statusFilter === "Availability Status" ||
        (statusFilter === "Available" && operator.status === "Active") ||
        (statusFilter === "On Project" && operator.status === "Active") ||
        (statusFilter === "On Leave" && operator.status !== "Active");

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [operators, searchTerm, roleFilter, statusFilter]);

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
            />
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <Link href="/operators/new">
            <button className="bg-primary hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-all shadow-sm hover:shadow-md whitespace-nowrap text-sm">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Operator
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
              <p className="text-[11px] text-slate-500 font-medium">Sales Admin</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0">
              AT
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8 max-w-[1600px] mx-auto w-full space-y-8">
          {!loading ? (
            <>
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Operators
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Manage drivers, riggers, and field staff intelligence
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-4 gap-6">
                <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                      Total Staff
                    </span>
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <span className="material-symbols-outlined text-xl">group</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-[28px] font-bold text-white leading-none">{kpis.total}</span>
                    <span className="text-sm font-semibold text-blue-400 mb-1">Active crew</span>
                  </div>
                  <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                      style={{ width: `${Math.min(kpis.total * 12, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                      On-Field
                    </span>
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <span className="material-symbols-outlined text-xl">location_on</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-[28px] font-bold text-white leading-none">{kpis.onField}</span>
                    <span className="text-sm font-semibold text-emerald-400 mb-1 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">bolt</span>Live
                    </span>
                  </div>
                  <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      style={{ width: `${Math.min(kpis.onField * 25, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                      Avg. Utilization
                    </span>
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                      <span className="material-symbols-outlined text-xl">trending_up</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-[28px] font-bold text-white leading-none">
                      {kpis.utilization}
                    </span>
                    <span className="text-sm font-semibold text-slate-400 mb-1">Baseline</span>
                  </div>
                  <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                      style={{ width: `${parseInt(kpis.utilization)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl relative group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                      AI Efficiency Score
                    </span>
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                      <span className="material-symbols-outlined text-xl">electric_bolt</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-[28px] font-bold text-white leading-none">N/A</span>
                    <span className="text-sm font-semibold text-slate-400 mb-1">Pending</span>
                  </div>
                  <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-700 w-0 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* AI Intelligence Banner */}
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-6 rounded-xl flex flex-wrap items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-primary">
                    <span className="material-symbols-outlined text-[28px]">auto_awesome</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-blue-900 dark:text-blue-300">
                      AI Workforce Intelligence
                    </h4>
                    <p className="text-sm text-blue-700/80 dark:text-blue-400/80 mt-0.5">
                      Predicted Demand: <span className="font-semibold">Stable</span> over the
                      next 7 days.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="hidden lg:block w-48 h-12">
                    <svg
                      className="w-full h-full text-blue-400 dark:text-blue-600"
                      preserveAspectRatio="none"
                      viewBox="0 0 100 30"
                    >
                      <path
                        d="M0,25 Q10,25 20,20 T40,15 T60,18 T80,10 T100,12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      />
                    </svg>
                  </div>
                  <button className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 shadow-sm hover:shadow-md transition-all">
                    <span className="material-symbols-outlined text-[20px]">psychology</span>
                    Ask AI: Optimize crew assignment
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white dark:bg-navy-deep p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center shadow-sm">
                <div className="relative flex-1 min-w-[320px]">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                    search
                  </span>
                  <input
                    className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary focus:border-primary dark:text-white placeholder:text-slate-400"
                    placeholder="Search by name, skill or license..."
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <select
                    className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm py-2.5 px-4 focus:ring-primary focus:border-primary dark:text-white min-w-[160px]"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option>All Roles</option>
                    <option>Driver</option>
                    <option>Rigger</option>
                    <option>Foreman</option>
                    <option>Operator</option>
                  </select>
                  <select
                    className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm py-2.5 px-4 focus:ring-primary focus:border-primary dark:text-white min-w-[180px]"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option>Availability Status</option>
                    <option>Available</option>
                    <option>On Project</option>
                    <option>On Leave</option>
                  </select>
                  <button className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg transition-colors">
                    <span className="material-symbols-outlined">filter_list</span>
                  </button>
                </div>
              </div>

              {/* Operators List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-3">
                    Active Crew{" "}
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs px-2.5 py-1 rounded-full">
                      {filteredOperators.length}
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-full border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                    AI: Recommended shift patterns to reduce fatigue
                  </div>
                </div>

                {filteredOperators.length === 0 ? (
                  <div className="bg-white dark:bg-navy-deep border border-slate-200 dark:border-slate-800 rounded-2xl min-h-[450px] flex flex-col items-center justify-center text-center p-12 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900/80 rounded-full flex items-center justify-center mb-8">
                      <span className="material-symbols-outlined text-slate-200 dark:text-slate-800 text-[48px]">
                        person_off
                      </span>
                    </div>
                    <h4 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">
                      No operators found
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mb-10 leading-relaxed text-base">
                      Add your first crew member to start assigning them to projects and tracking
                      their efficiency with our AI-driven workforce intelligence engine.
                    </p>
                    <Link href="/operators/new">
                      <button className="bg-navy-deep dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-bold flex items-center gap-3 transition-all transform hover:scale-[1.02] shadow-lg">
                        <span className="material-symbols-outlined">person_add</span>
                        Add First Operator
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOperators.map((operator) => (
                      <div
                        key={operator.name}
                        className="bg-white dark:bg-navy-deep border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-lg transition-all group cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                              {operator.employee_name?.[0]?.toUpperCase() || "O"}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                                {operator.employee_name}
                              </h3>
                              <p className="text-sm text-slate-500">{operator.designation}</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-full text-xs font-semibold">
                            {operator.status}
                          </span>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-sm">
                          {operator.cell_number && (
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                              <span className="material-symbols-outlined text-[18px]">phone</span>
                              {operator.cell_number}
                            </div>
                          )}
                          {operator.bio && (
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                              <span className="material-symbols-outlined text-[18px]">badge</span>
                              {operator.bio}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <span className="material-symbols-outlined text-[18px]">
                              calendar_today
                            </span>
                            Joined: {operator.date_of_joining}
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <span className="font-mono text-xs text-slate-400">{operator.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-500">Loading operators...</div>
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
