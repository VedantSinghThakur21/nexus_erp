import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
const API_KEY = process.env.ERP_API_KEY
const API_SECRET = process.env.ERP_API_SECRET
const MASTER_SITE_NAME = process.env.FRAPPE_SITE_NAME || 'erp.localhost'

/**
 * API endpoint for provision script to update tenant API credentials
 * POST /api/tenant/update-credentials
 * Body: { tenantName, apiKey, apiSecret, ownerEmail?, siteUrl? }
 */
export async function POST(request: NextRequest) {
  try {
    const { tenantName, apiKey, apiSecret, ownerEmail, siteUrl: providedSiteUrl } = await request.json()

    if (!tenantName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantName, apiKey, apiSecret' },
        { status: 400 }
      )
    }

    if (!API_KEY || !API_SECRET) {
      return NextResponse.json(
        { error: 'Server configuration error: Master API credentials not found' },
        { status: 500 }
      )
    }

    const authHeader = `token ${API_KEY}:${API_SECRET}`
    const siteUrl = providedSiteUrl || `https://${tenantName}.avariq.in`

    console.log(`🔍 Looking up tenant with subdomain: ${tenantName}`)

    // STEP 1: Find the tenant record by subdomain field (NOT by name)
    const searchParams = new URLSearchParams({
      doctype: 'SaaS Tenant',
      filters: JSON.stringify([['subdomain', '=', tenantName]]),
      fields: JSON.stringify(['name', 'subdomain', 'owner_email']),
      limit_page_length: '1'
    })

    const searchUrl = `${BASE_URL}/api/method/frappe.client.get_list?${searchParams}`
    
    const findResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'X-Frappe-Site-Name': MASTER_SITE_NAME,
      },
    })

    let tenantRecordName: string | null = null
    let shouldCreateRecord = false

    if (!findResponse.ok) {
      console.warn('⚠️ Search API failed, will attempt to create tenant record')
      shouldCreateRecord = true
    } else {
      const findData = await findResponse.json()
      const tenants = findData.message || []

      if (tenants.length === 0) {
        console.log(`📝 No tenant record found for subdomain '${tenantName}' - will create`)
        shouldCreateRecord = true
      } else {
        tenantRecordName = tenants[0].name
        console.log(`✅ Found existing tenant record: ${tenantRecordName}`)
      }
    }

    // STEP 2: UPSERT Logic - Update existing or Create new
    if (shouldCreateRecord) {
      // CREATE: Tenant record doesn't exist, create it now
      console.log(`🆕 Creating new SaaS Tenant record for subdomain: ${tenantName}`)
      
      const createEndpoint = `${BASE_URL}/api/resource/SaaS Tenant`
      const createResponse = await fetch(createEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'X-Frappe-Site-Name': MASTER_SITE_NAME,
        },
        body: JSON.stringify({
          subdomain: tenantName,
          site_url: siteUrl,
          status: 'Active',
          api_key: apiKey,
          api_secret: apiSecret,
          owner_email: ownerEmail,
          site_config: JSON.stringify({
            created_at: new Date().toISOString(),
            provisioned: true
          })
        }),
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        console.error('❌ Failed to create tenant record:', errorData)
        
        // Don't fail provisioning just because metadata creation failed
        return NextResponse.json({
          success: true,
          warning: 'Site provisioned successfully but failed to create master DB record',
          error: errorData.exception || errorData.message
        }, { status: 207 }) // 207 Multi-Status
      }

      const createData = await createResponse.json()
      tenantRecordName = createData.data?.name || tenantName
      console.log(`✅ Created tenant record: ${tenantRecordName}`)

    } else {
      // UPDATE: Tenant record exists, update with API credentials
      const updateEndpoint = `${BASE_URL}/api/resource/SaaS Tenant/${tenantRecordName}`
      
      console.log(`🔄 Updating tenant ${tenantRecordName} with API credentials...`)

      const updateResponse = await fetch(updateEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'X-Frappe-Site-Name': MASTER_SITE_NAME,
        },
        body: JSON.stringify({
          api_key: apiKey,
          api_secret: apiSecret,
          site_url: siteUrl,
          status: 'Active',
          ...(ownerEmail && { owner_email: ownerEmail }),
        }),
      })

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json()
        console.error('❌ Failed to update tenant:', errorData)
        
        // Don't fail provisioning just because metadata update failed
        return NextResponse.json({
          success: true,
          warning: 'Site provisioned successfully but failed to update master DB record',
          error: errorData.exception || errorData.message
        }, { status: 207 }) // 207 Multi-Status
      }

      console.log(`✅ Tenant ${tenantRecordName} API credentials updated successfully`)
    }

    return NextResponse.json({
      success: true,
      message: 'Tenant API credentials saved successfully',
      tenantRecord: tenantRecordName,
      action: shouldCreateRecord ? 'created' : 'updated'
    })

  } catch (error: any) {
    console.error('Error in update-credentials API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
