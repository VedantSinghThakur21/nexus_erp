/**
 * Tenant Role Sets — single source of truth
 * ==========================================
 * Maps each invitation role type to the full set of Frappe roles the user
 * needs on the tenant site.
 *
 * Used by:
 *  - app/actions/team.ts        (invite / update team members)
 *  - app/lib/api.ts             (auto-repair on 403)
 *  - app/actions/user-auth.ts   (login normalization)
 *
 * NOTE: We intentionally do NOT use role_profile_name because Frappe
 * silently overrides explicit roles when a profile is set.
 */

// Minimum Frappe roles every non-admin user needs to read the core ERPNext
// doctypes this app surfaces (Sales Invoice, Sales Order, CRM, etc.)
export const BASE_TENANT_ROLES = ['Employee', 'Sales User', 'Accounts User'] as const

export const ROLE_SETS: Record<string, string[]> = {
  // Keep System Manager for privileged operations, but also include the
  // baseline ERP roles used by Quotation/CRM list APIs in customized sites.
  // Item Manager + Stock Manager are required because ERPNext v15's Item
  // DocType locks create/write to these roles (System Manager alone isn't
  // always sufficient on tenants with the default permission matrix).
  admin:    [
    'System Manager',
    ...BASE_TENANT_ROLES,
    'Sales Manager',
    'Accounts Manager',
    'Item Manager',
    'Stock Manager',
    'Stock User',
  ],
  member:   [...BASE_TENANT_ROLES, 'Stock User'],
  sales:    [...BASE_TENANT_ROLES, 'Sales Manager', 'Item Manager', 'Stock User'],
  projects: [...BASE_TENANT_ROLES, 'Projects Manager', 'Projects User', 'Stock User'],
  accounts: [...BASE_TENANT_ROLES, 'Accounts Manager', 'Stock User'],
}

/** Returns the Frappe role objects expected by inviteTeamMember / updateRoles */
export function getRolesForType(roleType: string): { role: string }[] {
  const roles = ROLE_SETS[roleType] || ROLE_SETS.member
  return roles.map(r => ({ role: r }))
}

/** Primary display role label for a type */
export function getPrimaryRoleForType(roleType: string): string {
  return (ROLE_SETS[roleType] || ROLE_SETS.member)[0]
}
