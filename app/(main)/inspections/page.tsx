"use client";

import { useState, useEffect, useMemo } from "react";
import { getInspections } from "@/app/actions/inspections";
import type { Inspection } from "@/app/actions/inspections";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

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

  // Calculate KPIs using useMemo
  const kpis = useMemo(() => {
    const total = inspections.length;
    const passed = inspections.filter((i) => i.status === "Accepted").length;
    const failed = inspections.filter((i) => i.status === "Rejected").length;
    const pending = inspections.filter(
      (i) => i.inspection_type === "Outgoing" && i.status !== "Accepted"
    ).length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    return {
      total,
      passRate: `${passRate}%`,
      pending,
      avgRiskScore: "N/A",
    };
  }, [inspections]);

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

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-200 min-h-screen flex flex-col">
      {/* Header */}
      <PageHeader searchPlaceholder="Ask AI anything about inspections...">
        <Link href="/inspections/new">
          <button className="bg-[#3b82f6] hover:bg-blue-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition shadow-sm shadow-blue-500/20">
            <span className="material-symbols-outlined text-lg">add</span> New Inspection
          </button>
        </Link>
      </PageHeader>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-8 space-y-8">
          {!loading ? (
            <>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Inspections Workspace
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Manage quality control and automated safety assessments.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-4 gap-6">
                <div className="bg-[#111827] dark:bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                      Total Inspections
                    </span>
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <span className="material-symbols-outlined text-xl">assignment</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-[28px] font-bold text-white leading-none">
                      {kpis.total}
                    </span>
                    <span className="text-sm font-semibold text-slate-400 mb-1">Across all assets</span>
                  </div>
                  <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                      style={{ width: `${Math.min(kpis.total * 10, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-[#111827] dark:bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                      Pending PDI
                    </span>
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                      <span className="material-symbols-outlined text-xl">warning</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-[28px] font-bold text-white leading-none">
                      {kpis.pending}
                    </span>
                    <span className="text-sm font-semibold text-orange-400 mb-1 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">hourglass_empty</span>
                      Awaiting
                    </span>
                  </div>
                  <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                      style={{ width: `${Math.min(kpis.pending * 15, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-[#111827] dark:bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                      Pass Rate
                    </span>
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <span className="material-symbols-outlined text-xl">verified</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-[28px] font-bold text-white leading-none">
                      {kpis.passRate}
                    </span>
                    <span className="text-sm font-semibold text-emerald-400 mb-1">Quality standard</span>
                  </div>
                  <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      style={{ width: `${parseInt(kpis.passRate)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-[#111827] dark:bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-xl">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                      AI Risk Score
                    </span>
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                      <span className="material-symbols-outlined text-xl">trending_up</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-[28px] font-bold text-white leading-none">N/A</span>
                    <span className="text-sm font-semibold text-slate-400 mb-1">Unavailable</span>
                  </div>
                  <div className="mt-5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-700 w-0 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                    search
                  </span>
                  <input
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                    placeholder="Search by asset or inspector..."
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none min-w-[150px]"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option>All Status</option>
                  <option>Accepted</option>
                  <option>Rejected</option>
                  <option>In Progress</option>
                </select>
                <select
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none min-w-[180px]"
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
                  <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl min-h-[500px] flex flex-col items-center justify-center text-center p-12">
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
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-lg transition-all group cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                  {inspection.reference_name}
                                </h3>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-bold ${inspection.status === "Accepted"
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
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-500">Loading inspections...</div>
            </div>
          )}
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
    </div>
  );
}
