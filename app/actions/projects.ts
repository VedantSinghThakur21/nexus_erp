'use server'

import { frappeRequest } from "@/app/lib/api"
import { revalidatePath } from "next/cache"
import { canCreateProject, incrementUsage } from "./usage-limits"
import { headers } from "next/headers"

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
  // Check usage limits first
  const headersList = await headers()
  const subdomain = headersList.get('X-Subdomain')
  
  if (subdomain) {
    const usageCheck = await canCreateProject(subdomain)
    if (!usageCheck.allowed) {
      return { 
        error: usageCheck.message || 'Project limit reached',
        limitReached: true,
        currentUsage: usageCheck.current,
        limit: usageCheck.limit
      }
    }
  }
  
  const projectData = {
    doctype: 'Project',
    project_name: formData.get('project_name'),
    expected_end_date: formData.get('end_date'),
    status: 'Open',
    priority: 'Medium'
  }

  try {
    await frappeRequest('frappe.client.insert', 'POST', { doc: projectData })
    
    // Increment usage counter
    if (subdomain) {
      await incrementUsage(subdomain, 'usage_projects')
    }
    
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

// 6. UPDATE: Update Project Details
export async function updateProject(projectId: string, formData: FormData) {
  try {
    await frappeRequest('frappe.client.set_value', 'POST', {
      doctype: 'Project',
      name: projectId,
      fieldname: {
        status: formData.get('status'),
        priority: formData.get('priority'),
        expected_end_date: formData.get('end_date'),
        percent_complete: parseInt(formData.get('percent_complete') as string) || 0
      }
    })
    revalidatePath(`/projects/${projectId}`)
    revalidatePath('/projects')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to update project' }
  }
}

// 7. GET: Get Sales Orders linked to Project
export async function getProjectSalesOrders(projectId: string) {
  try {
    const orders = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Sales Order',
      filters: `[["project", "=", "${decodeURIComponent(projectId)}"]]`,
      fields: '["name", "customer_name", "transaction_date", "grand_total", "status"]',
      order_by: 'creation desc'
    }) as any[]
    
    // Get items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order: any) => {
        try {
          const fullOrder = await frappeRequest('frappe.client.get', 'GET', {
            doctype: 'Sales Order',
            name: order.name
          }) as any
          return { ...order, items: fullOrder.items }
        } catch {
          return order
        }
      })
    )
    
    return ordersWithItems
  } catch (error) {
    console.error('Failed to fetch project sales orders:', error)
    return []
  }
}

