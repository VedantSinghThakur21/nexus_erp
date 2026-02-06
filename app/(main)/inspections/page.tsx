"use client";

import { useState, useEffect } from "react";
import { getInspections } from "@/app/actions/inspections";
import type { Inspection } from "@/app/actions/inspections";
import Link from "next/link";

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [typeFilter, setTypeFilter] = useState("Inspection Type");

  useEffect(() => {
    loadInspections();
  }, []);

  async function loadInspections() {
    setLoading(true);
    try {
      const data = await getInspections();
      setInspections(data);
    } catch (error) {
      console.error("Failed to load inspections:", error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate stats
  const stats = {
    total: inspections.length,
    pendingPDI: inspections.filter(
      (i) => i.inspection_type === "Outgoing" && i.status !== "Accepted"
    ).length,
    passRate:
      inspections.length > 0
        ? Math.round(
            (inspections.filter((i) => i.status === "Accepted").length /
              inspections.length) *
              100
          )
        : 0,
  };

  // Filter inspections
  const filteredInspections = inspections.filter((inspection) => {
    const matchesSearch =
      inspection.reference_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.inspected_by?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All Status" || inspection.status === statusFilter;
    const matchesType =
      typeFilter === "Inspection Type" ||
      (typeFilter === "Pre-Delivery (PDI)" && inspection.inspection_type === "Outgoing") ||
      (typeFilter === "Maintenance" && inspection.inspection_type === "Incoming") ||
      (typeFilter === "Off-Hire" && inspection.inspection_type === "Incoming");

    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-slate-500">Loading inspections...</div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="h-20 bg-white dark:bg-card-dark border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 flex-shrink-0 z-10">
        <div className="flex items-center gap-8 flex-1">
          <div className="relative w-full max-w-xl">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">
              auto_awesome
            </span>
            <input
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-full text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              placeholder="Ask AI anything about inspections..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/inspections/new">
            <button className="flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-md active:scale-95">
              <span className="material-symbols-outlined text-lg">add</span>
              <span className="text-sm">New Inspection</span>
            </button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-[1600px] mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Inspections Workspace
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage quality control and automated safety assessments.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-card-dark p-6 rounded-xl border border-slate-800 shadow-xl flex flex-col gap-1">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Total Inspections
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-500 text-xl">
                    assignment
                  </span>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mt-2">{stats.total}</div>
              <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                <span className="material-symbols-outlined text-[14px]">history</span>
                <span>Across all assets</span>
              </div>
            </div>

            <div className="bg-card-dark p-6 rounded-xl border border-slate-800 shadow-xl flex flex-col gap-1">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Pending PDI
                </span>
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-orange-500 text-xl">
                    warning
                  </span>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mt-2">{stats.pendingPDI}</div>
              <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
                <span>Awaiting action</span>
              </div>
            </div>

            <div className="bg-card-dark p-6 rounded-xl border border-slate-800 shadow-xl flex flex-col gap-1">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Pass Rate
                </span>
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-500 text-xl">
                    verified
                  </span>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mt-2">{stats.passRate}%</div>
              <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                <span>Quality standard</span>
              </div>
            </div>

            <div className="bg-card-dark p-6 rounded-xl border border-slate-800 shadow-xl flex flex-col gap-1">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  AI Risk Score
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-500 text-xl">
                    trending_up
                  </span>
                </div>
              </div>
              <div className="text-3xl font-bold text-white mt-2">N/A</div>
              <div className="flex items-center gap-1 text-slate-500 text-xs mt-1">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                <span>Risk unavailable</span>
              </div>
            </div>
          </div>

          {/* AI Health Audit Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-xl p-6 mb-8 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 bg-white dark:bg-blue-800 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-300">
                  auto_awesome
                </span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  AI Inspection Assistant
                </h3>
                <p className="text-sm text-slate-600 dark:text-blue-200/70">
                  Intelligent predictive maintenance and pre-delivery analytics for your entire
                  fleet.
                </p>
              </div>
            </div>
            <div className="flex-1 max-w-sm w-full">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">
                Fleet-wide Health Trend
              </p>
              <div className="h-8 flex items-end gap-1.5">
                {[20, 40, 30, 60, 45, 80, 50, 70, 30, 55, 40, 65].map((height, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm ${
                      i === 7
                        ? "bg-blue-300 dark:bg-blue-500"
                        : "bg-blue-200 dark:bg-blue-800/40"
                    }`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap shadow-lg shadow-blue-500/20 active:scale-95 flex-shrink-0">
              <span className="material-symbols-outlined text-lg">rocket_launch</span>
              Run AI Health Audit
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 p-4 rounded-xl mb-6 shadow-sm flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                placeholder="Search by asset or inspector..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none min-w-[150px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All Status</option>
              <option>Accepted</option>
              <option>Rejected</option>
              <option>In Progress</option>
            </select>
            <select
              className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none min-w-[180px]"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option>Inspection Type</option>
              <option>Pre-Delivery (PDI)</option>
              <option>Maintenance</option>
              <option>Off-Hire</option>
            </select>
          </div>

          {/* Inspections List */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="font-bold text-slate-800 dark:text-slate-200">
                Recorded Inspections ({filteredInspections.length})
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Real-time sync active
              </div>
            </div>

            {filteredInspections.length === 0 ? (
              <div className="bg-white dark:bg-card-dark border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl min-h-[500px] flex flex-col items-center justify-center text-center p-12">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-5xl">
                    content_paste_off
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  No inspections recorded
                </h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mb-10 text-base leading-relaxed">
                  Start your first quality check by performing a Pre-Delivery Inspection (PDI)
                  before renting out equipment to ensure safety and quality standards.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/inspections/new">
                    <button className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg active:scale-95">
                      <span className="material-symbols-outlined text-lg">add</span>
                      Create First Inspection
                    </button>
                  </Link>
                  <button className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 px-8 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95">
                    <span className="material-symbols-outlined text-lg">file_download</span>
                    Import History
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInspections.map((inspection) => (
                  <Link key={inspection.name} href={`/inspections/${inspection.name}`}>
                    <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-lg transition-all group cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                              {inspection.reference_name}
                            </h3>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                inspection.status === "Accepted"
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                  : inspection.status === "Rejected"
                                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                  : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                              }`}
                            >
                              {inspection.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-base">
                                {inspection.inspection_type === "Outgoing"
                                  ? "arrow_forward"
                                  : "arrow_back"}
                              </span>
                              {inspection.inspection_type === "Outgoing"
                                ? "Pre-Delivery (PDI)"
                                : "Incoming Check"}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-base">
                                calendar_today
                              </span>
                              {inspection.report_date}
                            </span>
                            {inspection.inspected_by && (
                              <span className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-base">person</span>
                                {inspection.inspected_by}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 font-mono">{inspection.name}</p>
                          <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">
                            arrow_forward
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
        }
      `}</style>
    </>
  );
}
