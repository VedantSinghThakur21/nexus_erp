'use server'

import { frappeRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"

export interface Project {
  name: string
  project_name: string
  status: string
  percent_complete: number
  expected_end_date: string
  priority: string
  notes?: string
}

export interface Task {
  name: string
  subject: string
  status: string
  priority: string
  exp_end_date: string
}

// 1. READ: Get All Projects
export async function getProjects() {
  try {
    const response = await frappeRequest(
      'frappe.client.get_list', 
      'GET', 
      {
        doctype: 'Project',
        fields: '["name", "project_name", "status", "percent_complete", "expected_end_date", "priority"]',
        order_by: 'creation desc',
        limit_page_length: 50
      }
    )
    return response as Project[]
  } catch (error) {
    console.error("Failed to fetch projects:", error)
    return []
  }
}

// 2. READ: Get Single Project
export async function getProject(id: string) {
  try {
    const project = await frappeRequest('frappe.client.get', 'GET', {
      doctype: 'Project',
      name: decodeURIComponent(id)
    })
    return project as Project
  } catch (error) {
    return null
  }
}

// 3. READ: Get Tasks for a Project
export async function getTasks(projectId: string) {
  try {
    const tasks = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Task',
      filters: `[["project", "=", "${decodeURIComponent(projectId)}"]]`,
      fields: '["name", "subject", "status", "priority", "exp_end_date"]',
      order_by: 'creation desc'
    })
    return tasks as Task[]
  } catch (error) {
    return []
  }
}

// 4. CREATE: New Project
export async function createProject(formData: FormData) {
  const projectData = {
    doctype: 'Project',
    project_name: formData.get('project_name'),
    expected_end_date: formData.get('end_date'),
    status: 'Open',
    priority: 'Medium'
  }

  try {
    await frappeRequest('frappe.client.insert', 'POST', { doc: projectData })
    revalidatePath('/projects')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to create project' }
  }
}

// 5. CREATE: New Task
export async function createTask(projectId: string, formData: FormData) {
  const taskData = {
    doctype: 'Task',
    project: projectId,
    subject: formData.get('subject'),
    status: 'Open',
    priority: formData.get('priority') || 'Medium',
    exp_end_date: formData.get('date')
  }

  try {
    await frappeRequest('frappe.client.insert', 'POST', { doc: taskData })
    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to create task' }
  }
}

