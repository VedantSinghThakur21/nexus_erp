'use server'

import { redirect } from 'next/navigation'

/**
 * Generate a URL-safe subdomain from company name
 * Examples:
 *   "Acme Corp" → "acme-corp"
 *   "ABC Industries!" → "abc-industries"
 *   "123 Tech Co." → "tech-co"
 */
function generateSubdomain(companyName: string): string {
  return companyName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 63) // DNS label max length
}

/**
 * Verify if a site actually exists by checking the site folder AND database connectivity
 * Don't trust DB records - verify actual site structure
 */
async function verifySiteExists(siteName: string): Promise<boolean> {
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execAsync = promisify(exec)
  const DOCKER_COMPOSE_DIR = process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker'

  try {
    // Check 1: Site folder exists
    const checkFolderCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend test -d sites/${siteName}`
    await execAsync(checkFolderCmd, { timeout: 10000 })

    // Check 2: Site config file exists
    const checkConfigCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend test -f sites/${siteName}/site_config.json`
    await execAsync(checkConfigCmd, { timeout: 10000 })

    // Check 3: Database is accessible (most important check)
    const checkDbCmd = `cd ${DOCKER_COMPOSE_DIR} && docker compose exec -T backend bash -c "cd /home/frappe/frappe-bench && bench --site ${siteName} list-apps"`
    await execAsync(checkDbCmd, { timeout: 15000 })
    
    console.log('✅ Site verification passed:', siteName)
    return true
  } catch {
    console.log('❌ Site verification failed:', siteName)
    return false
  }
}

/**
 * Start provisioning of a Frappe site in background
 * Returns immediately - provisioning continues asynchronously
 */
async function provisionFrappeSite(
  siteName: string,
  adminPassword: string,
  adminEmail: string,
  companyName: string
): Promise<{ success: boolean; error?: string; isBackground?: boolean }> {
  const { exec } = await import('child_process')

  try {
    console.log('🚀 Checking Frappe site:', siteName)

    // Check if site already exists
    const siteExists = await verifySiteExists(siteName)
    
    if (siteExists) {
      console.log('✅ Site already exists:', siteName)
      return { success: true, isBackground: false }
    }

    // Site doesn't exist - trigger background provisioning
    console.log('🏗️ Site needs provisioning - starting background process')
    
    const scriptPath = process.cwd() + '/scripts/provision-tenant.js'
    const subdomain = siteName.split('.')[0]
    const provisionCmd = `node "${scriptPath}" "${subdomain}" "${adminEmail}" "${companyName}" "${adminPassword}" "${companyName}"`
    
    console.log('📝 Executing provisioning script (background)...')
    
    // Execute in background - don't await
    exec(provisionCmd, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Background provisioning failed:', error.message)
        console.error('stderr:', stderr)
      } else {
        console.log('✅ Background provisioning completed:', stdout)
      }
    })
    
    return { 
      success: true, 
      isBackground: true 
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Provisioning failed:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Main signup server action
 * Validates form, triggers background provisioning, redirects to login
 */
export async function signupUser(formData: FormData) {
  try {
    // 1. Extract and validate form data
    const companyName = formData.get('company_name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!companyName || !email || !password) {
      return {
        success: false,
        error: 'Please fill in all required fields',
      }
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: 'Please enter a valid email address',
      }
    }

    // Password requirements
    if (password.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters long',
      }
    }

    // 2. Generate URL-safe subdomain
    const tenantName = generateSubdomain(companyName)

    if (!tenantName || tenantName.length < 3) {
      return {
        success: false,
        error: 'Company name must be at least 3 characters and contain letters or numbers',
      }
    }

    console.log('Signup request:', { companyName, email, tenantName })

    // 3. Start background provisioning
    const siteName = `${tenantName}.${process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'avariq.in'}`
    const siteResult = await provisionFrappeSite(siteName, password, email, companyName)

    if (!siteResult.success) {
      return {
        success: false,
        error: siteResult.error || 'Failed to start tenant provisioning',
      }
    }

    // 4. Redirect to login page with success params
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const baseHost = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'localhost:3000'
    
    const loginUrl = siteResult.isBackground
      ? `${protocol}://${baseHost}/provisioning?tenant=${tenantName}&email=${encodeURIComponent(email)}`
      : `${protocol}://${tenantName}.${baseHost}/login?signup=success&tenant=${tenantName}`
    
    console.log('Redirecting to:', loginUrl)
    redirect(loginUrl)

  } catch (error: unknown) {
    // Re-throw redirect errors (they are not actual errors, just flow control)
    if (error && typeof error === 'object' && 'digest' in error) {
      const digestError = error as { digest?: string }
      if (digestError.digest?.startsWith('NEXT_REDIRECT')) {
        throw error
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during signup'
    console.error('Signup error:', error)

    return {
      success: false,
      error: errorMessage,
    }
  }
}
