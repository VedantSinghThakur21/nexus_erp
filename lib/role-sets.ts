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
  admin:    ['System Manager', ...BASE_TENANT_ROLES, 'Sales Manager', 'Accounts Manager'],
  member:   [...BASE_TENANT_ROLES],
  sales:    [...BASE_TENANT_ROLES, 'Sales Manager'],
  projects: [...BASE_TENANT_ROLES, 'Projects Manager', 'Projects User'],
  accounts: [...BASE_TENANT_ROLES, 'Accounts Manager'],
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
