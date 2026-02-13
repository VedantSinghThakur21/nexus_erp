/**
 * Role-Based Access Control (RBAC) - Module Permission Mappings
 * 
 * Maps application modules to allowed Frappe ERPNext roles.
 * Integrates with Frappe's permission system for granular access control.
 */

export const MODULE_PERMISSIONS: Record<string, string[]> = {
  dashboard: [
    'System Manager',
    'Sales Manager',
    'Sales User',
    'Accounts Manager',
    'Accounts User',
    'Projects Manager',
    'Projects User',
    'Stock Manager',
    'Stock User',
  ],
  bookings: [
    'System Manager',
    'Sales Manager',
    'Sales User',
    'Accounts Manager',
    'Projects Manager',
    'Projects User',
    'Stock Manager',
  ],
  catalogue: [
    'System Manager',
    'Sales Manager',
    'Sales User',
    'Projects Manager',
    'Projects User',
    'Stock Manager',
    'Stock User',
  ],
  crm: ['System Manager', 'Sales Manager', 'Sales User'],
  quotations: ['System Manager', 'Sales Manager', 'Sales User', 'Accounts Manager'],
  'sales-orders': [
    'System Manager',
    'Sales Manager',
    'Sales User',
    'Accounts Manager',
    'Accounts User',
    'Projects Manager',
  ],
  invoices: [
    'System Manager',
    'Sales Manager',
    'Sales User',
    'Accounts Manager',
    'Accounts User',
    'Projects Manager',
  ],
  payments: [
    'System Manager',
    'Sales Manager',
    'Accounts Manager',
    'Accounts User',
    'Projects Manager',
  ],
  projects: [
    'System Manager',
    'Sales Manager',
    'Accounts Manager',
    'Projects Manager',
    'Projects User',
  ],
  operators: ['System Manager', 'Projects Manager', 'Stock Manager', 'Stock User'],
  agents: ['System Manager', 'Projects Manager', 'Stock Manager', 'Stock User'],
  inspections: [
    'System Manager',
    'Projects Manager',
    'Projects User',
    'Stock Manager',
    'Stock User',
  ],
  'pricing-rules': ['System Manager', 'Sales Manager', 'Accounts Manager'],
  team: ['System Manager', 'Sales Manager', 'Projects Manager', 'Stock Manager'],
  'admin-tenants': ['System Manager'],
  settings: ['System Manager'],
}

/**
 * Check if user has access to a specific module
 */
export function canAccessModule(module: string, userRoles: string[]): boolean {
  // System Manager has access to everything
  if (userRoles.includes('System Manager')) {
    return true
  }

  const allowedRoles = MODULE_PERMISSIONS[module] || []
  return userRoles.some((role) => allowedRoles.includes(role))
}

/**
 * Get accessible modules for given roles
 */
export function getAccessibleModules(userRoles: string[]): string[] {
  return Object.keys(MODULE_PERMISSIONS).filter((module) =>
    canAccessModule(module, userRoles)
  )
}

/**
 * Permission level types
 */
export type PermissionLevel = 'full' | 'view' | 'none'

/**
 * Get permission level for a module based on roles
 * (for future fine-grained permissions)
 */
export function getPermissionLevel(
  module: string,
  userRoles: string[]
): PermissionLevel {
  if (!canAccessModule(module, userRoles)) {
    return 'none'
  }

  // System Manager always has full access
  if (userRoles.includes('System Manager')) {
    return 'full'
  }

  // Check for manager roles (full access)
  const managerRoles = [
    'Sales Manager',
    'Accounts Manager',
    'Projects Manager',
    'Stock Manager',
  ]
  if (userRoles.some((role) => managerRoles.includes(role))) {
    return 'full'
  }

  // User roles typically have view-only access
  return 'view'
}

/**
 * Role display names for UI
 */
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  'System Manager': 'Admin',
  'Sales Manager': 'Sales Manager',
  'Sales User': 'Sales',
  'Accounts Manager': 'Accounts Manager',
  'Accounts User': 'Accounts',
  'Projects Manager': 'Projects Manager',
  'Projects User': 'Projects',
  'Stock Manager': 'Stock Manager',
  'Stock User': 'Stock',
  Guest: 'Guest',
}

/**
 * Get primary role (highest privilege) for display
 */
export function getPrimaryRole(userRoles: string[]): string {
  const roleHierarchy = [
    'System Manager',
    'Sales Manager',
    'Accounts Manager',
    'Projects Manager',
    'Stock Manager',
    'Sales User',
    'Accounts User',
    'Projects User',
    'Stock User',
    'Guest',
  ]

  for (const role of roleHierarchy) {
    if (userRoles.includes(role)) {
      return role
    }
  }

  return 'Guest'
}
