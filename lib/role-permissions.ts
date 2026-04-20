/**
 * Role-Based Access Control (RBAC) - Module Permission Mappings
 * 
 * Maps application modules to allowed Frappe ERPNext roles.
 * Integrates with Frappe's permission system for granular access control.
 */

/** Frappe site users may have `Administrator` (site admin) without `System Manager` in the mapped role list. */
function isErpSuperUser(userRoles: string[]): boolean {
  return userRoles.some((r) => r === 'System Manager' || r === 'Administrator')
}

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
  'agent-inbox': ['System Manager', 'Sales Manager', 'Sales User'],
  inspections: [
    'System Manager',
    'Projects Manager',
    'Projects User',
    'Stock Manager',
    'Stock User',
  ],
  'pricing-rules': ['System Manager', 'Sales Manager', 'Accounts Manager'],
  team: ['System Manager'],
  'admin-tenants': ['System Manager'],
  settings: ['System Manager'],
}

/**
 * Check if user has access to a specific module
 */
export function canAccessModule(module: string, userRoles: string[]): boolean {
  if (isErpSuperUser(userRoles)) {
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

  if (isErpSuperUser(userRoles)) {
    return 'full'
  }

  // CVE-5 Fix: Only return 'full' if the manager role is also present in
  // MODULE_PERMISSIONS for this specific module. Without this check, a
  // Stock Manager would get 'full' on payments, invoices, etc.
  const managerRoles = [
    'Sales Manager',
    'Accounts Manager',
    'Projects Manager',
    'Stock Manager',
  ]
  const moduleRoles = MODULE_PERMISSIONS[module] || []
  const hasModuleScopedManagerAccess = userRoles.some(
    (role) => managerRoles.includes(role) && moduleRoles.includes(role)
  )
  if (hasModuleScopedManagerAccess) {
    return 'full'
  }

  // User roles (Sales User, Accounts User, …) have view-only access
  return 'view'
}

/**
 * Role display names for UI
 */
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  Administrator: 'Administrator',
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
    'Administrator',
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
    create: ['System Manager', 'Sales Manager'],
    edit: ['System Manager', 'Sales Manager'],
    delete: ['System Manager', 'Sales Manager'],
    convert: ['System Manager', 'Sales Manager'],
    view: ['System Manager', 'Sales Manager', 'Sales User'],
  },
  quotations: {
    create: ['System Manager', 'Sales Manager'],
    edit: ['System Manager', 'Sales Manager'],
    delete: ['System Manager', 'Sales Manager'],
    view: ['System Manager', 'Sales Manager', 'Sales User', 'Accounts Manager'],
  },
  invoices: {
    create: ['System Manager', 'Sales Manager', 'Accounts Manager'],
    edit: ['System Manager', 'Sales Manager', 'Accounts Manager'],
    delete: ['System Manager', 'Accounts Manager'],
    view: ['System Manager', 'Sales Manager', 'Sales User', 'Accounts Manager', 'Accounts User', 'Projects Manager'],
  },
  payments: {
    create: ['System Manager', 'Accounts Manager'],
    edit: ['System Manager', 'Accounts Manager'],
    delete: ['System Manager', 'Accounts Manager'],
    view: ['System Manager', 'Sales Manager', 'Accounts Manager', 'Accounts User', 'Projects Manager'],
  },
  projects: {
    create: ['System Manager', 'Projects Manager'],
    edit: ['System Manager', 'Sales Manager', 'Projects Manager'],
    delete: ['System Manager', 'Projects Manager'],
    view: ['System Manager', 'Sales Manager', 'Accounts Manager', 'Projects Manager', 'Projects User'],
  },
  bookings: {
    create: ['System Manager', 'Sales Manager', 'Projects Manager'],
    edit: ['System Manager', 'Sales Manager', 'Projects Manager'],
    delete: ['System Manager', 'Sales Manager', 'Projects Manager'],
    view: ['System Manager', 'Sales Manager', 'Sales User', 'Accounts Manager', 'Projects Manager', 'Projects User', 'Stock Manager'],
  },
  agent: {
    view: ['System Manager', 'Sales Manager', 'Projects Manager'],
    approve: ['System Manager', 'Sales Manager', 'Projects Manager'],
    rollback: ['System Manager'],
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
  return canPerform(module, action, userRoles)
}

export function canPerform(
  module: string,
  action: string,
  userRoles: string[],
): boolean {
  if (isErpSuperUser(userRoles)) return true

  const allowedRoles = ACTION_PERMISSIONS[module]?.[action] ?? []
  return userRoles.some((role) => allowedRoles.includes(role))
}
