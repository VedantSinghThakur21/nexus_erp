'use server'

import { getTenantContext } from '@/app/lib/api'

/**
 * Setup CRM Master Data for a newly provisioned tenant
 * Creates default Opportunity Types and Sales Stages
 *
 * Delegates to the provisioning service which runs with ignore_permissions=True,
 * so regular tenant users (who lack System Manager) can trigger this from Settings.
 */

interface SetupResult {
  success: boolean
  error?: string
  results?: {
    opportunityTypes: { created: number; existing: number; failed: number }
    salesStages: { created: number; existing: number; failed: number }
  }
}

export async function setupCrmMasterData(): Promise<SetupResult> {
  try {
    console.log('[CRM Setup] Starting CRM master data setup via provisioning service...')

    const context = await getTenantContext()
    if (!context.isTenant || !context.subdomain) {
      return { success: false, error: 'Not in a tenant context' }
    }

    const { seedTenantDefaults } = await import('@/lib/provisioning-client')
    const seedResult = await seedTenantDefaults(context.subdomain)

    // Parse provisioning service result into the expected format
    const oppResult = String(seedResult.result?.opportunity_types || '')
    const stageResult = String(seedResult.result?.sales_stages || '')

    const oppCreated = oppResult.startsWith('seeded: ') ? oppResult.replace('seeded: ', '').split(',').filter(Boolean).length : 0
    const stageCreated = stageResult.startsWith('seeded: ') ? stageResult.replace('seeded: ', '').split(',').filter(Boolean).length : 0

    console.log('[CRM Setup] Setup complete:', seedResult.result)

    return {
      success: true,
      results: {
        opportunityTypes: { created: oppCreated, existing: oppCreated === 0 ? 4 : 0, failed: 0 },
        salesStages: { created: stageCreated, existing: stageCreated === 0 ? 7 : 0, failed: 0 },
      }
    }
  } catch (error: any) {
    console.error('[CRM Setup] Error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
