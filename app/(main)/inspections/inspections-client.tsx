'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { getInspections, type Inspection } from '@/app/actions/inspections'

export function InspectionsClient(props: { initialInspections: Inspection[] }) {
  const [inspections, setInspections] = useState<Inspection[]>(props.initialInspections)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [typeFilter, setTypeFilter] = useState('Inspection Type')

  async function reload() {
    setLoading(true)
    try {
      const data = await getInspections()
      setInspections(data)
    } catch (error) {
      console.error('Failed to load inspections:', error)
    } finally {
      setLoading(false)
    }
  }

  const kpis = useMemo(() => {
    const total = inspections.length
    const passed = inspections.filter((i) => i.status === 'Accepted').length
    const failed = inspections.filter((i) => i.status === 'Rejected').length
    const pending = inspections.filter((i) => i.inspection_type === 'Outgoing' && i.status !== 'Accepted').length
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0

    const failureRate = total > 0 ? (failed / total) * 100 : 0
    const pendingRisk = Math.min((pending / 10) * 100, 100)
    const computedRisk = total > 0 ? Math.round(failureRate * 0.6 + pendingRisk * 0.4) : 0

    return {
      total,
      passRate: `${passRate}%`,
      pending,
      avgRiskScore: computedRisk,
    }
  }, [inspections])

  const filteredInspections = inspections.filter((inspection) => {
    const matchesSearch =
      inspection.reference_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.inspected_by?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'All Status' || inspection.status === statusFilter

    const matchesType =
      typeFilter === 'Inspection Type' ||
      (typeFilter === 'Pre-Delivery (PDI)' && inspection.inspection_type === 'Outgoing') ||
      (typeFilter === 'Maintenance' && inspection.inspection_type === 'Incoming') ||
      (typeFilter === 'Off-Hire' && inspection.inspection_type === 'Incoming')

    return matchesSearch && matchesStatus && matchesType
  })

  // If we rendered with initial inspections, don't flash a spinner.
  useEffect(() => {
    // noop — keeps the component structure aligned with other pages
  }, [])

  return (
    <div className="app-shell flex flex-col">
      <PageHeader searchPlaceholder="Ask AI anything about inspections...">
        <Link href="/inspections/new">
          <button className="bg-[#3b82f6] hover:bg-blue-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition shadow-sm shadow-blue-500/20">
            <span className="material-symbols-outlined text-lg">add</span> New Inspection
          </button>
        </Link>
      </PageHeader>

      <main className="app-content">
        <div className="app-container w-full space-y-8">
          {!loading ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inspections Workspace</h1>
                  <p className="text-sm text-muted-foreground ">Manage quality control and automated safety assessments.</p>
                </div>
                <button
                  onClick={() => void reload()}
                  className="px-4 py-2 rounded-lg border border-border bg-background text-sm font-semibold hover:bg-muted transition"
                >
                  Refresh
                </button>
              </div>

              {/* KPI Cards (kept as-is) */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-6 shadow-none">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Total Inspections</span>
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <span className="material-symbols-outlined text-xl">assignment</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-[28px] font-bold text-foreground leading-none">{kpis.total}</span>
                    <span className="text-sm font-semibold text-slate-400 mb-1">Across all assets</span>
                  </div>
                  <div className="mt-5 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                      style={{ width: `${Math.min(kpis.total * 10, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6 shadow-none">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Pending PDI</span>
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                      <span className="material-symbols-outlined text-xl">warning</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-[28px] font-bold text-foreground leading-none">{kpis.pending}</span>
                    <span className="text-sm font-semibold text-orange-400 mb-1 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">hourglass_empty</span>
                      Awaiting
                    </span>
                  </div>
                  <div className="mt-5 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                      style={{ width: `${Math.min(kpis.pending * 15, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6 shadow-none">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Pass Rate</span>
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <span className="material-symbols-outlined text-xl">verified</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-[28px] font-bold text-foreground leading-none">{kpis.passRate}</span>
                    <span className="text-sm font-semibold text-emerald-400 mb-1">Quality standard</span>
                  </div>
                  <div className="mt-5 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      style={{ width: `${parseInt(kpis.passRate)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6 shadow-none">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Fleet Risk Score</span>
                    <div
                      className={`p-2 rounded-lg ${
                        kpis.avgRiskScore >= 70
                          ? 'bg-red-500/10 text-red-400'
                          : kpis.avgRiskScore >= 40
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {kpis.avgRiskScore >= 70 ? 'warning' : kpis.avgRiskScore >= 40 ? 'trending_up' : 'health_and_safety'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-[28px] font-bold text-foreground leading-none">{kpis.avgRiskScore}/100</span>
                    <span
                      className={`text-sm font-semibold mb-1 ${
                        kpis.avgRiskScore >= 70 ? 'text-red-400' : kpis.avgRiskScore >= 40 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {kpis.avgRiskScore >= 70 ? 'Critical' : kpis.avgRiskScore >= 40 ? 'Moderate' : 'Healthy'}
                    </span>
                  </div>
                  <div className="mt-5 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full shadow-sm ${
                        kpis.avgRiskScore >= 70
                          ? 'bg-red-500 shadow-red-500/50'
                          : kpis.avgRiskScore >= 40
                            ? 'bg-amber-500 shadow-amber-500/50'
                            : 'bg-emerald-500 shadow-emerald-500/50'
                      }`}
                      style={{ width: `${kpis.avgRiskScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Minimal filters (keeps page interactive; avoids rework) */}
              <div className="bg-card dark:bg-background border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row gap-4">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search inspections..."
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-sm"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-lg border border-border bg-background text-sm"
                >
                  <option>All Status</option>
                  <option>Accepted</option>
                  <option>Rejected</option>
                  <option>Draft</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-lg border border-border bg-background text-sm"
                >
                  <option>Inspection Type</option>
                  <option>Pre-Delivery (PDI)</option>
                  <option>Maintenance</option>
                  <option>Off-Hire</option>
                </select>
              </div>

              <div className="space-y-3">
                {filteredInspections.map((i) => (
                  <Link
                    key={i.name}
                    href={`/inspections/${i.name}`}
                    className="block rounded-xl border border-border bg-card p-5 hover:bg-muted/30 transition"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">{i.reference_name || i.name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {i.inspection_type} • {i.status} • {i.inspected_by}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-nowrap">
                        {i.report_date ? new Date(i.report_date).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  </Link>
                ))}
                {filteredInspections.length === 0 && (
                  <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
                    No inspections found.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="app-content flex min-h-[50vh] items-center justify-center">
              <div className="text-muted-foreground">Loading inspections...</div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

