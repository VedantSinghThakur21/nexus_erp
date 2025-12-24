import { getProjects } from "@/app/actions/projects"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FolderKanban, Calendar, Clock, CheckCircle2, TrendingUp } from "lucide-react"
import Link from "next/link"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"

export default async function ProjectsPage() {
  const projects = await getProjects()

  const stats = {
    total: projects.length,
    open: projects.filter(p => p.status === 'Open').length,
    completed: projects.filter(p => p.status === 'Completed').length,
    onHold: projects.filter(p => p.status === 'On Hold').length,
    avgCompletion: projects.length > 0 
      ? Math.round(projects.reduce((sum, p) => sum + (p.percent_complete || 0), 0) / projects.length)
      : 0
  }

  return (
    // FIX: Added to ignore browser extension attributes
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Projects</h1>
          <p className="text-slate-500 dark:text-slate-400">Track tasks and milestones</p>
        </div>
        
        <CreateProjectDialog />
        
      </div>

      {/* Stats Cards */}
      {projects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.avgCompletion}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <div className="col-span-full p-12 text-center border rounded-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No active projects</h3>
            <p className="text-slate-500 mt-2">Create a project to start tracking work.</p>
          </div>
        ) : (
          projects.map((project) => (
            <Link key={project.name} href={`/projects/${project.name}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                    {project.project_name}
                  </CardTitle>
                  <FolderKanban className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 mt-2">
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                      <span>Status</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        project.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 
                        'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Completion</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">{project.percent_complete || 0}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-blue-600 rounded-full" 
                                style={{ width: `${project.percent_complete || 0}%` }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <Calendar className="h-3 w-3" />
                        <span>Due: {project.expected_end_date || "No deadline"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

