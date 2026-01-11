/**
 * Production-grade API key activation poller
 * Waits for tenant site API keys to become active after provisioning
 */

interface PollResult {
  active: boolean
  attempts: number
  totalWaitTime: number
  error?: string
}

/**
 * Poll tenant API endpoint until keys are active
 * More reliable than fixed wait times
 */
export async function pollTenantApiActivation(
  siteName: string,
  apiKey: string,
  apiSecret: string,
  maxAttempts: number = 12,
  initialDelay: number = 5000,
  maxDelay: number = 15000
): Promise<PollResult> {
  const erpnextUrl = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
  let currentDelay = initialDelay
  let totalWaitTime = 0
  
  console.log('🔄 Starting API key activation polling for:', siteName)
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Poll ${attempt}/${maxAttempts}] Testing API keys... (waited ${totalWaitTime}ms so far)`)
      
      // Test with a simple method that requires authentication
      const response = await fetch(`${erpnextUrl}/api/method/frappe.auth.get_logged_user`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${apiKey}:${apiSecret}`,
          'X-Frappe-Site-Name': siteName,
          'Accept': 'application/json'
        },
        cache: 'no-store'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.message || data.data) {
          console.log(`✅ API keys active after ${attempt} attempts (${totalWaitTime}ms)`)
          return {
            active: true,
            attempts: attempt,
            totalWaitTime
          }
        }
      }
      
      // Not active yet, wait before next attempt
      if (attempt < maxAttempts) {
        console.log(`⏳ Keys not active yet, waiting ${currentDelay}ms...`)
        await new Promise(resolve => setTimeout(resolve, currentDelay))
        totalWaitTime += currentDelay
        
        // Exponential backoff with max cap
        currentDelay = Math.min(currentDelay * 1.5, maxDelay)
      }
      
    } catch (error: any) {
      console.error(`[Poll ${attempt}/${maxAttempts}] Error:`, error.message)
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, currentDelay))
        totalWaitTime += currentDelay
        currentDelay = Math.min(currentDelay * 1.5, maxDelay)
      }
    }
  }
  
  console.error(`❌ API keys failed to activate after ${maxAttempts} attempts (${totalWaitTime}ms)`)
  return {
    active: false,
    attempts: maxAttempts,
    totalWaitTime,
    error: 'API keys did not activate within timeout period'
  }
}

/**
 * Wrapper for tenant operations with automatic polling
 */
export async function executeTenantOperationWithPolling<T>(
  siteName: string,
  apiKey: string,
  apiSecret: string,
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  // First poll until keys are active
  const pollResult = await pollTenantApiActivation(siteName, apiKey, apiSecret)
  
  if (!pollResult.active) {
    throw new Error(`API keys not active for tenant ${siteName} after polling`)
  }
  
  // Now execute the operation
  console.log(`🚀 Executing ${operationName} with active API keys`)
  return await operation()
}
