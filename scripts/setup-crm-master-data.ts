/**
 * Setup CRM Master Data for ERPNext
 * Creates default Opportunity Types and Sales Stages
 * Run this for new tenants to ensure CRM module works properly
 */

import { frappeRequest } from '../app/lib/api'

// Default Opportunity Types for Equipment Rental business
const DEFAULT_OPPORTUNITY_TYPES = [
  'Sales',
  'Rental',
  'Maintenance',
  'Service'
]

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

async function setupOpportunityTypes() {
  console.log('\n📋 Setting up Opportunity Types...')
  
  for (const typeName of DEFAULT_OPPORTUNITY_TYPES) {
    try {
      // Check if already exists
      const existing = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Opportunity Type',
        filters: { name: typeName },
        limit_page_length: 1
      }) as any[]

      if (existing && existing.length > 0) {
        console.log(`  ✓ Opportunity Type "${typeName}" already exists`)
        continue
      }

      // Create new Opportunity Type
      await frappeRequest('frappe.client.insert', 'POST', {
        doc: {
          doctype: 'Opportunity Type',
          name: typeName
        }
      })
      
      console.log(`  ✅ Created Opportunity Type: ${typeName}`)
    } catch (error: any) {
      console.error(`  ❌ Failed to create Opportunity Type "${typeName}":`, error.message)
    }
  }
}

async function setupSalesStages() {
  console.log('\n📊 Setting up Sales Stages...')
  
  for (const stageName of DEFAULT_SALES_STAGES) {
    try {
      // Check if already exists
      const existing = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Sales Stage',
        filters: { name: stageName },
        limit_page_length: 1
      }) as any[]

      if (existing && existing.length > 0) {
        console.log(`  ✓ Sales Stage "${stageName}" already exists`)
        continue
      }

      // Create new Sales Stage
      await frappeRequest('frappe.client.insert', 'POST', {
        doc: {
          doctype: 'Sales Stage',
          stage_name: stageName
        }
      })
      
      console.log(`  ✅ Created Sales Stage: ${stageName}`)
    } catch (error: any) {
      console.error(`  ❌ Failed to create Sales Stage "${stageName}":`, error.message)
    }
  }
}

async function main() {
  console.log('🚀 Setting up CRM Master Data for ERPNext...\n')
  
  try {
    await setupOpportunityTypes()
    await setupSalesStages()
    
    console.log('\n✅ CRM Master Data setup complete!\n')
  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { setupOpportunityTypes, setupSalesStages }
