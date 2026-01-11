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
 * Production mode: Keys should be active immediately due to session warmup
 */
export async function pollTenantApiActivation(
  siteName: string,
  apiKey: string,
  apiSecret: string,
  maxAttempts: number = 6,
  initialDelay: number = 2000,
  maxDelay: number = 5000
): Promise<PollResult> {
  const erpnextUrl = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
  let currentDelay = initialDelay
  let totalWaitTime = 0
  
  console.log('🔄 Starting API key verification for:', siteName)
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[Poll ${attempt}/${maxAttempts}] Testing API keys... (waited ${totalWaitTime}ms so far)`)
      
      // Test with a simple GET endpoint that works with API keys
      // frappe.client.get_list is more reliable than auth endpoints
      const response = await fetch(`${erpnextUrl}/api/method/frappe.client.get_list`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${apiKey}:${apiSecret}`,
          'X-Frappe-Site-Name': siteName,
          'Accept': 'application/json'
        },
        cache: 'no-store'
      })
      
      const data = await response.json()
      
      // If we get a valid response (even if it's an error about missing params), keys are active
      if (response.status === 200 || (response.status === 417 && data.exc_type !== 'AuthenticationError')) {
        console.log(`✅ API keys active after ${attempt} attempts (${totalWaitTime}ms)`)
        return {
          active: true,
          attempts: attempt,
          totalWaitTime
        }
      }
      
      // Check if it's specifically an auth error
      if (data.exc_type === 'AuthenticationError' || data.exception?.includes('AuthenticationError')) {
        console.log(`🔑 Auth error - keys not ready yet (status: ${response.status})`)
      } else {
        console.log(`📝 Response status ${response.status}, checking next attempt...`)
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
