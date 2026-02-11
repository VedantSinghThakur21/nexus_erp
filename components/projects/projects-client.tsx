"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { CreateProjectDialog } from "./create-project-dialog"
import { PageHeader } from "@/components/page-header"

interface Project {
  name: string
  project_name: string
  status: string
  percent_complete: number
  expected_end_date: string
  priority: string
  notes?: string
}

interface ProjectsClientProps {
  projects: Project[]
}

export function ProjectsClient({ projects }: ProjectsClientProps) {
  const router = useRouter()

  // Calculate KPIs
  const totalProjects = projects.length
  const openProjects = projects.filter(p => p.status === 'Open').length
  const completedProjects = projects.filter(p => p.status === 'Completed').length
  const avgCompletion = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + (p.percent_complete || 0), 0) / projects.length)
    : 0

  // Get project health based on completion and status
  const getProjectHealth = (project: Project): { label: string; color: string } => {
    if (project.status === 'Completed') return { label: '100%', color: 'emerald' }
    if (project.percent_complete >= 75) return { label: 'On Track', color: 'emerald' }
    if (project.percent_complete >= 50) return { label: 'In Progress', color: 'blue' }
    if (project.percent_complete >= 25) return { label: 'At Risk', color: 'amber' }
    return { label: 'Critical', color: 'red' }
  }

  // Get AI insight based on project metrics
  const getAIInsight = (project: Project): { text: string; color: string; icon: string } => {
    if (project.status === 'Completed') {
      return { text: 'Completed Successfully', color: 'emerald', icon: 'check_circle' }
    }
    if (project.percent_complete === 0) {
      return { text: 'Not Started', color: 'slate', icon: 'schedule' }
    }
    if (project.percent_complete >= 80) {
      return { text: 'Ahead of Schedule', color: 'emerald', icon: 'trending_up' }
    }
    if (project.percent_complete >= 50) {
      return { text: 'On Track', color: 'blue', icon: 'auto_awesome' }
    }
    return { text: 'Bottleneck Detected', color: 'amber', icon: 'warning_amber' }
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      {/* Header */}
      <PageHeader searchPlaceholder="Ask AI anything about your projects...">
        <CreateProjectDialog />
      </PageHeader>

      <main className="flex-1 overflow-y-auto">
        <div className="px-8 pt-8 pb-4">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Projects Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">High-fidelity workspace for enterprise project intelligence.</p>
        </div>

        <div className="px-8 space-y-8 pb-12">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-lg flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Total Projects</span>
                <span className="material-symbols-outlined text-blue-400 text-2xl">folder</span>
              </div>
              <div className="text-[28px] font-bold text-white">{totalProjects}</div>
            </div>

            <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-lg flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Open</span>
                <span className="material-symbols-outlined text-blue-400 text-2xl">schedule</span>
              </div>
              <div className="text-[28px] font-bold text-white">{openProjects}</div>
            </div>

            <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-lg flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Completed</span>
                <span className="material-symbols-outlined text-emerald-400 text-2xl">check_circle</span>
              </div>
              <div className="text-[28px] font-bold text-white">{completedProjects}</div>
            </div>

            <div className="bg-[#111827] p-6 rounded-xl border border-slate-800 shadow-lg flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">Avg. Completion</span>
                <span className="material-symbols-outlined text-purple-400 text-2xl">trending_up</span>
              </div>
              <div className="text-[28px] font-bold text-white">{avgCompletion}%</div>
            </div>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.length === 0 ? (
              <div className="col-span-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center p-12 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-4">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-2xl">add</span>
                </div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Start New Project</p>
                <p className="text-xs text-slate-400 mt-1">Initialize with AI assistance</p>
              </div>
            ) : (
              <>
                {projects.map((project) => {
                  const health = getProjectHealth(project)
                  const aiInsight = getAIInsight(project)

                  const healthColors: Record<string, { bg: string; text: string }> = {
                    emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/50', text: 'text-emerald-700 dark:text-emerald-300' },
                    blue: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-700 dark:text-blue-300' },
                    amber: { bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-700 dark:text-amber-300' },
                    red: { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-700 dark:text-red-300' },
                    slate: { bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-700 dark:text-slate-300' },
                  }

                  const insightColors: Record<string, { bg: string; text: string; icon: string }> = {
                    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', icon: 'emerald' },
                    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', icon: 'blue' },
                    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', icon: 'amber' },
                    red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', icon: 'red' },
                    slate: { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400', icon: 'slate' },
                  }

                  const currentHealth = healthColors[health.color] || healthColors.slate
                  const currentInsight = insightColors[aiInsight.color] || insightColors.slate

                  return (
                    <Link key={project.name} href={`/projects/${project.name}`}>
                      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
                        <div className="p-6 flex-1">
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <h3 className="text-[16px] font-bold text-primary group-hover:underline cursor-pointer">{project.project_name}</h3>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                                  {project.status}
                                </span>
                                <span className={`flex items-center text-[12px] font-medium ${currentHealth.text} ${currentHealth.bg} px-2 py-0.5 rounded-full`}>
                                  <span className="material-symbols-outlined text-[14px] mr-1">auto_awesome</span>
                                  Health: {project.status === 'Completed' ? '100' : project.percent_complete}%
                                </span>
                              </div>
                            </div>
                            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                              <span className="material-symbols-outlined">more_horiz</span>
                            </button>
                          </div>

                          <div className="space-y-5">
                            {/* Progress Bar */}
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[14px] text-slate-500 dark:text-slate-400">Completion</span>
                                <span className="text-[16px] font-semibold text-slate-700 dark:text-slate-200">
                                  {project.percent_complete}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                                <div
                                  className="bg-primary h-full rounded-full transition-all"
                                  style={{ width: `${project.percent_complete}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* AI Insight */}
                            <div className={`flex items-center space-x-2 ${currentInsight.bg} p-3 rounded-lg border ${currentInsight.bg.includes('emerald') ? 'border-emerald-200 dark:border-emerald-700/50' : currentInsight.bg.includes('blue') ? 'border-blue-200 dark:border-blue-700/50' : currentInsight.bg.includes('amber') ? 'border-amber-200 dark:border-amber-700/50' : 'border-slate-100 dark:border-slate-700/50'}`}>
                              <span className={`material-symbols-outlined text-[18px] ${currentInsight.text.split(' ')[0]}`}>
                                {aiInsight.icon}
                              </span>
                              <span className={`text-[12px] ${currentInsight.text}`}>
                                AI Insight: <span className="font-semibold">{aiInsight.text}</span>
                              </span>
                            </div>

                            {/* Due Date */}
                            <div className="flex items-center text-slate-400 pt-1">
                              <span className="material-symbols-outlined text-[16px] mr-2">calendar_today</span>
                              <span className="text-[12px]">Due: {project.expected_end_date || 'No deadline'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}

                {/* New Project Card */}
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-4">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-2xl">add</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Start New Project</p>
                  <p className="text-xs text-slate-400 mt-1">Initialize with AI assistance</p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
