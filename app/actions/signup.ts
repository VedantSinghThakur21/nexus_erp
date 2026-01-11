'use server'

import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)

interface SignupData {
  email: string
  password: string
  fullName: string
  organizationName: string
}

interface TenantProvisionResult {
  success: boolean
  site?: string
  url?: string
  email?: string
  apiKey?: string
  apiSecret?: string
  organizationName?: string
  elapsed?: number
  error?: string
}

interface SignupResult {
  success: boolean
  error?: string
  message?: string
  data?: {
    site: string
    url: string
    apiKey: string
    apiSecret: string
  }
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

/**
 * Validate password strength
 * Requirements: Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
 */
function isValidPassword(password: string): boolean {
  if (password.length < 8) return false
  if (!/[A-Z]/.test(password)) return false
  if (!/[a-z]/.test(password)) return false
  if (!/[0-9]/.test(password)) return false
  return true
}

/**
 * Sanitize name inputs to prevent XSS
 */
function sanitizeName(name: string): string {
  return name
    .replace(/[<>"'&]/g, '') // Remove HTML/script characters
    .trim()
    .substring(0, 140) // Max length
}

/**
 * Generate subdomain from organization name
 */
function generateSubdomain(organizationName: string): string {
  return organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 32) // Max length
}

/**
 * Multi-Tenant Signup with Provisioning
 * Creates a complete tenant environment with site, user, and API keys
 */
export async function signup(data: SignupData): Promise<SignupResult> {
  try {
    // Step 1: Validate inputs
    if (!isValidEmail(data.email)) {
      return {
        success: false,
        error: 'Invalid email format'
      }
    }

    if (!isValidPassword(data.password)) {
      return {
        success: false,
        error: 'Password must be at least 8 characters with uppercase, lowercase, and number'
      }
    }

    const sanitizedFullName = sanitizeName(data.fullName)
    const sanitizedOrgName = sanitizeName(data.organizationName)

    if (!sanitizedFullName || sanitizedFullName.length < 2) {
      return {
        success: false,
        error: 'Invalid full name'
      }
    }

    if (!sanitizedOrgName || sanitizedOrgName.length < 2) {
      return {
        success: false,
        error: 'Invalid organization name'
      }
    }

    // Step 2: Generate subdomain
    const subdomain = generateSubdomain(sanitizedOrgName)
    
    if (!subdomain || subdomain.length < 3) {
      return {
        success: false,
        error: 'Organization name too short or invalid'
      }
    }

    console.log(`🚀 Starting tenant provisioning for: ${subdomain}.localhost`)

    // Step 3: Execute provisioning script
    const scriptPath = path.join(process.cwd(), 'scripts', 'provision-tenant.js')
    
    try {
      const { stdout, stderr } = await execFileAsync(
        'node',
        [
          scriptPath,
          subdomain,
          data.email,
          sanitizedFullName,
          data.password,
          sanitizedOrgName
        ],
        {
          timeout: 300000, // 5 minute timeout (provisioning takes ~3 minutes)
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          env: {
            ...process.env,
            DOCKER_SERVICE: process.env.DOCKER_SERVICE || 'backend',
            ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin',
            DB_ROOT_PASSWORD: process.env.DB_ROOT_PASSWORD || 'admin',
            DOCKER_COMPOSE_DIR: process.env.DOCKER_COMPOSE_DIR || '/home/ubuntu/frappe_docker'
          }
        }
      )

      // Log stderr (progress messages)
      if (stderr) {
        console.error('Provisioning output:', stderr)
      }

      // Parse JSON result from stdout
      const lastLine = stdout.trim().split('\n').pop()
      if (!lastLine) {
        throw new Error('No output from provisioning script')
      }

      const result: TenantProvisionResult = JSON.parse(lastLine)

      if (!result.success) {
        throw new Error(result.error || 'Provisioning failed')
      }

      console.log(`✅ Tenant provisioned successfully: ${result.site}`)
      console.log(`⏱️  Elapsed time: ${result.elapsed}s`)

      // Step 4: Store tenant credentials in database (optional)
      // TODO: Create Tenant DocType entry with API keys

      return {
        success: true,
        message: `Account created successfully! Your workspace is ready at ${result.site}`,
        data: {
          site: result.site!,
          url: result.url!,
          apiKey: result.apiKey!,
          apiSecret: result.apiSecret!
        }
      }

    } catch (execError: any) {
      console.error('Provisioning script error:', execError)
      
      // Try to parse error output
      if (execError.stdout) {
        try {
          const errorResult: TenantProvisionResult = JSON.parse(
            execError.stdout.trim().split('\n').pop() || '{}'
          )
          if (errorResult.error) {
            return {
              success: false,
              error: `Provisioning failed: ${errorResult.error}`
            }
          }
        } catch (parseError) {
          // Couldn't parse error, use generic message
        }
      }

      return {
        success: false,
        error: `Failed to provision tenant: ${execError.message}`
      }
    }

  } catch (error: any) {
    console.error('Signup error:', error)
    
    return {
      success: false,
      error: error.message || 'Failed to create account. Please try again.'
    }
  }
}

