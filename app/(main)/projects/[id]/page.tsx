import { getProject, getTasks, getProjectSalesOrders } from "@/app/actions/projects"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FolderKanban, Calendar, CheckCircle2, Clock, Truck, FileText, IndianRupee } from "lucide-react"
import Link from "next/link"
import { CreateTaskDialog } from "@/components/projects/create-task-dialog"
import { UpdateProjectDialog } from "@/components/projects/update-project-dialog"

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await getProject(id)
  const tasks = await getTasks(id)
  const salesOrders = await getProjectSalesOrders(id)

  if (!project) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Project not found</h1>
        <Link href="/projects">
          <Button variant="outline" className="mt-4">Back to Projects</Button>
        </Link>
      </div>
    )
  }

  const completedTasks = tasks.filter(t => t.status === 'Completed').length
  const openTasks = tasks.filter(t => t.status === 'Open').length
  const workingTasks = tasks.filter(t => t.status === 'Working').length

  const statusColors: Record<string, string> = {
    'Open': 'bg-blue-100 text-blue-700',
    'Completed': 'bg-green-100 text-green-700',
    'Cancelled': 'bg-red-100 text-red-700',
    'On Hold': 'bg-yellow-100 text-yellow-700'
  }

  const taskStatusColors: Record<string, string> = {
    'Open': 'bg-blue-100 text-blue-700',
    'Working': 'bg-purple-100 text-purple-700',
    'Completed': 'bg-green-100 text-green-700',
    'Cancelled': 'bg-red-100 text-red-700'
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <Link href="/projects">
        <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </Button>
      </Link>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {project.project_name}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{project.notes || 'No description'}</p>
        </div>
        <div className="flex gap-2 items-center">
          <UpdateProjectDialog project={project} />
          <Badge className={statusColors[project.status] || 'bg-slate-100 text-slate-800'}>
            {project.status}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <FolderKanban className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{workingTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{openTasks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Project Info */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Project Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-500">Status</label>
              <p className="text-slate-900 dark:text-slate-200 mt-1">{project.status}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Priority</label>
              <p className="text-slate-900 dark:text-slate-200 mt-1">{project.priority}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Due Date</label>
              <p className="text-slate-900 dark:text-slate-200 mt-1">{project.expected_end_date || 'No deadline'}</p>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-slate-500 mb-2 block">Progress</label>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completion</span>
                <span className="font-medium">{project.percent_complete || 0}%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all" 
                  style={{ width: `${project.percent_complete || 0}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Orders / Bookings */}
      {salesOrders.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                Equipment Bookings
              </CardTitle>
              <Badge variant="outline">{salesOrders.length} bookings</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {salesOrders.map((order: any) => (
                <Link key={order.name} href={`/bookings/${order.name}`}>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-white">{order.customer_name}</div>
                      <div className="text-sm text-slate-500 mt-1">
                        {order.transaction_date} • {order.items?.[0]?.item_name || 'Equipment'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 dark:text-white">₹{order.grand_total?.toLocaleString('en-IN') || '0'}</div>
                      <Badge className={order.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Tasks</CardTitle>
            <CreateTaskDialog projectId={id} />
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FolderKanban className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No tasks yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.name} className="flex items-center justify-between p-4 border rounded-lg hover:border-blue-200 transition-all">
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-white">{task.subject}</div>
                    <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {task.exp_end_date || 'No deadline'}
                      </span>
                      <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                    </div>
                  </div>
                  <Badge className={taskStatusColors[task.status] || 'bg-slate-100 text-slate-800'}>
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
