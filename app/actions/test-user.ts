'use server'

import { frappeRequest } from '@/app/lib/api'

/**
 * Test function to verify ERPNext connection and create a test user
 * This helps debug user creation issues
 */
export async function testUserCreation(email: string, password: string, fullName: string) {
  try {
    console.log('Testing user creation for:', email)
    
    const [firstName, ...lastNameParts] = fullName.split(' ')
    
    // Method 1: Try with minimal fields first
    const minimalUser = {
      doctype: 'User',
      email: email,
      first_name: firstName,
      enabled: 1,
      send_welcome_email: 0,
      new_password: password
    }
    
    try {
      const result = await frappeRequest('frappe.client.insert', 'POST', {
        doc: minimalUser
      })
      
      console.log('User created successfully with minimal fields:', result)
      return { success: true, method: 'minimal', user: result }
    } catch (error: any) {
      console.error('Minimal user creation failed:', error.message)
      
      // Method 2: Try with full fields
      const fullUser = {
        doctype: 'User',
        email: email,
        first_name: firstName,
        last_name: lastNameParts.join(' ') || '',
        full_name: fullName,
        enabled: 1,
        send_welcome_email: 0,
        new_password: password,
        user_type: 'System User'
      }
      
      try {
        const result2 = await frappeRequest('frappe.client.insert', 'POST', {
          doc: fullUser
        })
        
        console.log('User created successfully with full fields:', result2)
        return { success: true, method: 'full', user: result2 }
      } catch (error2: any) {
        console.error('Full user creation also failed:', error2.message)
        return { 
          success: false, 
          error: error2.message,
          details: 'Both minimal and full user creation methods failed'
        }
      }
    }
  } catch (error: any) {
    console.error('Test user creation error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Check if a user already exists
 */
export async function checkUserExists(email: string) {
  try {
    const result = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'User',
      filters: JSON.stringify({ email: email }),
      fields: JSON.stringify(['name', 'email', 'enabled']),
      limit_page_length: 1
    })
    
    return { exists: result && result.length > 0, user: result?.[0] }
  } catch (error: any) {
    console.error('Check user exists error:', error)
    return { exists: false, error: error.message }
  }
}
