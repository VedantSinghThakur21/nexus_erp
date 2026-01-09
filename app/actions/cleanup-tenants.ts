'use server'

import { frappeRequest } from '@/app/lib/api'

/**
 * DANGER: This will delete all tenants and their associated data
 * Use only for development/testing cleanup
 */
export async function deleteAllTenants() {
  try {
    console.log('🗑️  Starting tenant cleanup...')

    // Get all tenants
    const tenants = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Tenant',
      fields: JSON.stringify(['name', 'subdomain', 'email']),
      limit_page_length: 999
    })

    if (!tenants || tenants.length === 0) {
      console.log('No tenants to delete')
      return { success: true, deleted: 0 }
    }

    console.log(`Found ${tenants.length} tenants to delete`)

    let deletedCount = 0
    const errors: any[] = []

    for (const tenant of tenants) {
      try {
        console.log(`Deleting tenant: ${tenant.subdomain}`)
        await frappeRequest('frappe.client.delete', 'POST', {
          doctype: 'Tenant',
          name: tenant.name
        })
        deletedCount++
      } catch (error) {
        console.error(`Failed to delete tenant ${tenant.subdomain}:`, error)
        errors.push({ tenant: tenant.subdomain, error })
      }
    }

    console.log(`✅ Deleted ${deletedCount} tenants`)
    
    return {
      success: true,
      deleted: deletedCount,
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
 * Delete all non-Administrator users from the master site
 */
export async function deleteAllUsers() {
  try {
    console.log('🗑️  Starting user cleanup...')

    // Get all users except Administrator and Guest
    const users = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'User',
      filters: JSON.stringify([
        ['name', 'not in', ['Administrator', 'Guest']]
      ]),
      fields: JSON.stringify(['name', 'email', 'full_name']),
      limit_page_length: 999
    })

    if (!users || users.length === 0) {
      console.log('No users to delete')
      return { success: true, deleted: 0 }
    }

    console.log(`Found ${users.length} users to delete`)

    let deletedCount = 0
    const errors: any[] = []

    for (const user of users) {
      try {
        console.log(`Deleting user: ${user.email}`)
        await frappeRequest('frappe.client.delete', 'POST', {
          doctype: 'User',
          name: user.name
        })
        deletedCount++
      } catch (error) {
        console.error(`Failed to delete user ${user.email}:`, error)
        errors.push({ user: user.email, error })
      }
    }

    console.log(`✅ Deleted ${deletedCount} users`)
    
    return {
      success: true,
      deleted: deletedCount,
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
 * Full cleanup - delete all tenants and users (except Administrator)
 */
export async function fullCleanup() {
  console.log('🧹 Starting full cleanup...')
  
  const tenantsResult = await deleteAllTenants()
  const usersResult = await deleteAllUsers()
  
  return {
    tenants: tenantsResult,
    users: usersResult,
    success: tenantsResult.success && usersResult.success
  }
}
