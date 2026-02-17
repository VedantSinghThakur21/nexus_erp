import { NextRequest, NextResponse } from 'next/server'
import { frappeRequest } from '@/app/lib/api'

export const dynamic = 'force-dynamic'

// Default Opportunity Types for Equipment Rental business
const DEFAULT_OPPORTUNITY_TYPES = ['Sales', 'Rental', 'Maintenance', 'Service']

// Default Sales Stages with typical progression
const DEFAULT_SALES_STAGES = [
  'Prospecting',
  'Qualification', 
  'Needs Analysis',
  'Proposal',
  'Negotiation',
  'Won',
  'Lost'
]

export async function POST(req: NextRequest) {
  try {
    console.log('[CRM Setup] Starting CRM master data setup...')
    
    const results = {
      opportunityTypes: { created: 0, existing: 0, failed: 0 },
      salesStages: { created: 0, existing: 0, failed: 0 }
    }

    // Setup Opportunity Types
    for (const typeName of DEFAULT_OPPORTUNITY_TYPES) {
      try {
        const existing = await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'Opportunity Type',
          filters: { name: typeName },
          limit_page_length: 1
        }) as any[]

        if (existing && existing.length > 0) {
          console.log(`[CRM Setup] Opportunity Type "${typeName}" already exists`)
          results.opportunityTypes.existing++
          continue
        }

        await frappeRequest('frappe.client.insert', 'POST', {
          doc: {
            doctype: 'Opportunity Type',
            name: typeName
          }
        })
        
        console.log(`[CRM Setup] Created Opportunity Type: ${typeName}`)
        results.opportunityTypes.created++
      } catch (error: any) {
        console.error(`[CRM Setup] Failed to create Opportunity Type "${typeName}":`, error.message)
        results.opportunityTypes.failed++
      }
    }

    // Setup Sales Stages
    for (const stageName of DEFAULT_SALES_STAGES) {
      try {
        const existing = await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'Sales Stage',
          filters: { name: stageName },
          limit_page_length: 1
        }) as any[]

        if (existing && existing.length > 0) {
          console.log(`[CRM Setup] Sales Stage "${stageName}" already exists`)
          results.salesStages.existing++
          continue
        }

        await frappeRequest('frappe.client.insert', 'POST', {
          doc: {
            doctype: 'Sales Stage',
            stage_name: stageName
          }
        })
        
        console.log(`[CRM Setup] Created Sales Stage: ${stageName}`)
        results.salesStages.created++
      } catch (error: any) {
        console.error(`[CRM Setup] Failed to create Sales Stage "${stageName}":`, error.message)
        results.salesStages.failed++
      }
    }

    console.log('[CRM Setup] Setup complete:', results)

    return NextResponse.json({
      success: true,
      message: 'CRM master data setup complete',
      results
    })

  } catch (error: any) {
    console.error('[CRM Setup] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
