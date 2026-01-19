'use server'

import { userRequest, frappeRequest } from "@/app/lib/api"
import { cookies } from 'next/headers'

/**
 * Debug endpoint to check which database we're connected to
 */
export async function debugDatabaseConnection() {
  try {
    const cookieStore = await cookies()
    const userEmail = cookieStore.get('user_email')?.value
    const tenantSiteUrl = cookieStore.get('tenant_site_url')?.value
    const userType = cookieStore.get('user_type')?.value
    const sid = cookieStore.get('sid')?.value

    console.log('=== DEBUG DATABASE CONNECTION ===')
    console.log('User Email:', userEmail)
    console.log('Tenant Site URL:', tenantSiteUrl)
    console.log('User Type:', userType)
    console.log('Session ID (first 20 chars):', sid?.substring(0, 20))

    // Try to get current user from Frappe
    const currentUser = await frappeRequest('frappe.auth.get_logged_user')
    console.log('Current logged in user:', currentUser)

    // Get site config to verify which database we're on
    const siteConfig = await frappeRequest('frappe.client.get_value', 'GET', {
      doctype: 'System Settings',
      fieldname: '["name"]'
    })
    console.log('System Settings:', siteConfig)

    // Count records to see if we're on tenant or master DB
    const leadCount = await frappeRequest('frappe.client.get_count', 'GET', {
      doctype: 'Lead'
    })
    console.log('Lead count in current database:', leadCount)

    const tenantCount = await frappeRequest('frappe.client.get_count', 'GET', {
      doctype: 'Tenant'
    })
    console.log('Tenant count (should be 0 on tenant DB, >0 on master):', tenantCount)

    return {
      userEmail,
      tenantSiteUrl,
      userType,
      currentUser,
      leadCount,
      tenantCount: tenantCount as number,
      isOnMasterDB: (tenantCount as number) > 0
    }
  } catch (error: any) {
    console.error('Debug error:', error)
    return { error: error.message }
  }
}
