'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { getOperators, type Operator } from '@/app/actions/operators'

export function OperatorsClient(props: { initialOperators: Operator[] }) {
  const [operators, setOperators] = useState<Operator[]>(props.initialOperators)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Availability Status')

  async function reload() {
    setLoading(true)
    try {
      const data = await getOperators()
      setOperators(data)
    } catch (error) {
      console.error('Failed to load operators:', error)
    } finally {
      setLoading(false)
    }
  }

  const kpis = useMemo(() => {
    const total = operators.length
    const onField = operators.filter((op) => op.status === 'Active').length
    const utilization = total > 0 ? Math.round((onField / total) * 100) : 0

    return {
      total,
      onField,
      utilization: `${utilization}%`,
      aiScore: 'N/A',
    }
  }, [operators])

  const filteredOperators = useMemo(() => {
    return operators.filter((operator) => {
      const matchesSearch =
        searchTerm === '' ||
        operator.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        operator.bio?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === 'Availability Status' ||
        (statusFilter === 'Available' && operator.status === 'Active') ||
        (statusFilter === 'On Project' && operator.status === 'Active') ||
        (statusFilter === 'On Leave' && operator.status !== 'Active')

      return matchesSearch && matchesStatus
    })
  }, [operators, searchTerm, statusFilter])

  return (
    <div className="app-shell flex flex-col">
      <PageHeader>
        <Link href="/operators/new">
          <button className="bg-primary hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-semibold transition-all shadow-sm hover:shadow-md whitespace-nowrap text-sm">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Operator
          </button>
        </Link>
      </PageHeader>

      <main className="app-content flex-1">
        <div className="app-container w-full space-y-8">
          {!loading ? (
            <>
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Operators
                </h2>
                <p className="text-sm text-muted-foreground ">
                  Manage drivers, riggers, and field staff intelligence
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative rounded-xl border border-border bg-card p-6 shadow-none">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                      Total Staff
                    </span>
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <span className="material-symbols-outlined text-xl">group</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-[28px] font-bold text-foreground leading-none">
                      {kpis.total}
                    </span>
                    <span className="text-sm font-semibold text-blue-400 mb-1">Active crew</span>
                  </div>
                  <div className="mt-5 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                      style={{ width: `${Math.min(kpis.total * 12, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="relative rounded-xl border border-border bg-card p-6 shadow-none">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                      On-Field
                    </span>
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <span className="material-symbols-outlined text-xl">location_on</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-[28px] font-bold text-foreground leading-none">
                      {kpis.onField}
                    </span>
                    <span className="text-sm font-semibold text-emerald-400 mb-1 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">bolt</span>Live
                    </span>
                  </div>
                  <div className="mt-5 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      style={{ width: `${Math.min(kpis.onField * 25, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="relative rounded-xl border border-border bg-card p-6 shadow-none">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                      Avg. Utilization
                    </span>
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                      <span className="material-symbols-outlined text-xl">trending_up</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-[28px] font-bold text-foreground leading-none">
                      {kpis.utilization}
                    </span>
                    <span className="text-sm font-semibold text-slate-400 mb-1">Baseline</span>
                  </div>
                  <div className="mt-5 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                      style={{ width: `${parseInt(kpis.utilization)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="relative rounded-xl border border-border bg-card p-6 shadow-none">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
                      AI Efficiency Score
                    </span>
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                      <span className="material-symbols-outlined text-xl">electric_bolt</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-[28px] font-bold text-foreground leading-none">N/A</span>
                    <span className="text-sm font-semibold text-slate-400 mb-1">Pending</span>
                  </div>
                  <div className="mt-5 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-slate-700 w-0 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-card p-5 rounded-xl border border-border flex flex-wrap gap-4 items-center shadow-sm">
                <div className="relative flex-1 min-w-[320px]">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search operators..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option>Availability Status</option>
                  <option>Available</option>
                  <option>On Project</option>
                  <option>On Leave</option>
                </select>

                <button
                  onClick={() => void reload()}
                  className="px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted transition"
                >
                  Refresh
                </button>
              </div>

              {/* List */}
              <div className="space-y-3">
                {filteredOperators.map((operator) => (
                  <div
                    key={operator.name}
                    className="rounded-xl border border-border bg-card p-5 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">{operator.employee_name}</div>
                      <div className="text-sm text-muted-foreground truncate">{operator.bio || '—'}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{operator.status}</div>
                  </div>
                ))}
                {filteredOperators.length === 0 && (
                  <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
                    No operators found.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="app-content flex min-h-[50vh] items-center justify-center">
              <div className="text-muted-foreground ">Loading operators...</div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

