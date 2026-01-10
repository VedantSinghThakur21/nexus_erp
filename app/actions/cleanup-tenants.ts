'use server'

import { frappeRequest } from '@/app/lib/api'

/**
 * DANGER: This will delete ALL tenants including suspended ones
 * Use only for development/testing cleanup
 */
export async function deleteAllTenants() {
  try {
    console.log('🗑️  Starting tenant cleanup...')

    // Get ALL tenants regardless of status
    const tenants = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Tenant',
      filters: JSON.stringify([]),  // No filters = get everything
      fields: JSON.stringify(['name', 'subdomain', 'status']),
      limit_page_length: 999
    })

    if (!tenants || tenants.length === 0) {
      console.log('No tenants to delete')
      return { success: true, deleted: 0 }
    }

    console.log(`Found ${tenants.length} tenants to delete (including suspended)`)

    let deletedCount = 0
    const errors: any[] = []

    for (const tenant of tenants) {
      try {
        console.log(`Deleting tenant: ${tenant.subdomain} (${tenant.status})`)
        await frappeRequest('frappe.client.delete', 'POST', {
          doctype: 'Tenant',
          name: tenant.name
        })
        deletedCount++
      } catch (error: any) {
        console.error(`Failed to delete tenant ${tenant.subdomain}:`, error.message)
        errors.push({ tenant: tenant.subdomain, error: error.message })
      }
    }

    console.log(`✅ Deleted ${deletedCount}/${tenants.length} tenants`)
    
    return {
      success: true,
      deleted: deletedCount,
      total: tenants.length,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error) {
    console.error('Cleanup error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Disable all non-Administrator users from the master site
 * ERPNext doesn't allow deleting users, only disabling them
 * Also skips System Manager users as ERPNext requires at least one active System Manager
 */
export async function deleteAllUsers() {
  try {
    console.log('🗑️  Starting user cleanup (disabling users)...')

    // Get all users except Administrator and Guest
    const users = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'User',
      filters: JSON.stringify([
        ['name', 'not in', ['Administrator', 'Guest']]
      ]),
      fields: JSON.stringify(['name', 'email', 'full_name', 'enabled']),
      limit_page_length: 999
    })

    if (!users || users.length === 0) {
      console.log('No users to disable')
      return { success: true, deleted: 0 }
    }

    console.log(`Found ${users.length} users to check`)

    let disabledCount = 0
    let skippedCount = 0
    const errors: any[] = []

    for (const user of users) {
      try {
        if (user.enabled === 1) {
          console.log(`Attempting to disable user: ${user.email}`)
          // Try to disable the user - ERPNext will throw error if System Manager
          try {
            await frappeRequest('frappe.client.set_value', 'POST', {
              doctype: 'User',
              name: user.name,
              fieldname: 'enabled',
              value: 0
            })
            disabledCount++
            console.log(`✓ Disabled: ${user.email}`)
          } catch (disableError: any) {
            // Check if error is about System Manager protection
            const errorMsg = disableError.message || ''
            if (errorMsg.includes('System Manager') || errorMsg.includes('at least one')) {
              console.log(`⊘ Skipped System Manager: ${user.email}`)
              skippedCount++
            } else {
              // Re-throw if it's a different error
              throw disableError
            }
          }
        } else {
          console.log(`User already disabled: ${user.email}`)
        }
      } catch (error: any) {
        console.error(`Failed to process user ${user.email}:`, error)
        errors.push({ user: user.email, error: error.message })
      }
    }

    console.log(`✅ Disabled ${disabledCount} users, skipped ${skippedCount} System Managers`)
    
    return {
      success: true,
      deleted: disabledCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error) {
    console.error('User cleanup error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Full cleanup - delete all tenants and disable users (except Administrator)
 */
export async function fullCleanup() {
  console.log('🧹 Starting full cleanup...')
  
  const tenantsResult = await deleteAllTenants()
  const usersResult = await deleteAllUsers()
  
  return {
    tenants: tenantsResult,
    users: usersResult,
    success: tenantsResult.success && usersResult.success,
    message: `Deleted ${tenantsResult.deleted} tenants and disabled ${usersResult.deleted} users`
  }
}
