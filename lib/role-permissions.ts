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
  Employee: 'Team Member',
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
    'Employee',
    'Guest',
  ]

  for (const role of roleHierarchy) {
    if (userRoles.includes(role)) {
      return role
    }
  }

  return 'Guest'
}

// ============================================================================
// Action-level permissions
// ============================================================================

/**
 * Per-module action permissions.
 * Roles listed in each action can perform that action.
 * System Manager always has all permissions (handled in canPerformAction).
 */
export const ACTION_PERMISSIONS: Record<string, Record<string, string[]>> = {
  crm: {
    create: ['Sales Manager'],
    edit:   ['Sales Manager'],
    delete: ['Sales Manager'],
    convert: ['Sales Manager'],
  },
  quotations: {
    create: ['Sales Manager'],
    edit:   ['Sales Manager'],
    delete: ['Sales Manager'],
  },
  'sales-orders': {
    create: ['Sales Manager', 'Accounts Manager'],
    edit:   ['Sales Manager', 'Accounts Manager'],
    delete: ['Sales Manager'],
  },
  invoices: {
    create: ['Sales Manager', 'Accounts Manager'],
    edit:   ['Sales Manager', 'Accounts Manager'],
    delete: ['Accounts Manager'],
  },
  payments: {
    create: ['Accounts Manager'],
    edit:   ['Accounts Manager'],
    delete: ['Accounts Manager'],
  },
  projects: {
    create: ['Projects Manager'],
    edit:   ['Projects Manager', 'Sales Manager'],
    delete: ['Projects Manager'],
  },
  bookings: {
    create: ['Sales Manager', 'Projects Manager'],
    edit:   ['Sales Manager', 'Projects Manager'],
    delete: ['Sales Manager', 'Projects Manager'],
  },
  catalogue: {
    create: ['Sales Manager', 'Stock Manager'],
    edit:   ['Sales Manager', 'Stock Manager'],
    delete: ['Stock Manager'],
  },
  operators: {
    create: ['Projects Manager', 'Stock Manager'],
    edit:   ['Projects Manager', 'Stock Manager'],
    delete: ['Projects Manager', 'Stock Manager'],
  },
  agents: {
    create: ['Projects Manager', 'Stock Manager'],
    edit:   ['Projects Manager', 'Stock Manager'],
    delete: ['Projects Manager', 'Stock Manager'],
  },
  inspections: {
    create: ['Projects Manager', 'Stock Manager'],
    edit:   ['Projects Manager', 'Stock Manager'],
    delete: ['Projects Manager'],
  },
  'pricing-rules': {
    create: ['Sales Manager', 'Accounts Manager'],
    edit:   ['Sales Manager', 'Accounts Manager'],
    delete: ['Accounts Manager'],
  },
  team: {
    create: ['Sales Manager', 'Projects Manager', 'Stock Manager'],
    edit:   ['Sales Manager', 'Projects Manager', 'Stock Manager'],
    delete: ['Sales Manager', 'Projects Manager', 'Stock Manager'],
  },
}

/**
 * Check whether a user with the given roles can perform an action on a module.
 * System Manager can always perform any action.
 */
export function canPerformAction(
  module: string,
  action: string,
  userRoles: string[],
): boolean {
  if (userRoles.includes('System Manager')) return true

  const allowedRoles = ACTION_PERMISSIONS[module]?.[action] ?? []
  return userRoles.some((role) => allowedRoles.includes(role))
}
