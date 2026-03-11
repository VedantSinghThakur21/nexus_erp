import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
const API_KEY = process.env.ERP_API_KEY
const API_SECRET = process.env.ERP_API_SECRET
const MASTER_SITE_NAME = process.env.FRAPPE_SITE_NAME || 'erp.localhost'
const PROVISIONING_SECRET = process.env.PROVISIONING_API_SECRET

/**
 * API endpoint for provision script to update tenant API credentials
 * POST /api/tenant/update-credentials
 * Body: { tenantName, apiKey, apiSecret, ownerEmail?, siteUrl? }
 * Auth: Requires X-Provisioning-Secret header matching PROVISIONING_API_SECRET
 */
export async function POST(request: NextRequest) {
  try {
    // Server-to-server auth: verify provisioning secret
    const providedSecret = request.headers.get('x-provisioning-secret')
    if (!PROVISIONING_SECRET || !providedSecret || providedSecret !== PROVISIONING_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      shouldCreateRecord = true
    } else {
      const findData = await findResponse.json()
      const tenants = findData.message || []

      if (tenants.length === 0) {
        shouldCreateRecord = true
      } else {
        tenantRecordName = tenants[0].name
      }
    }

    // STEP 2: UPSERT Logic - Update existing or Create new
    if (shouldCreateRecord) {
      // CREATE: Tenant record doesn't exist, create it now

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

    } else {
      // UPDATE: Tenant record exists, update with API credentials
      const updateEndpoint = `${BASE_URL}/api/resource/SaaS Tenant/${tenantRecordName}`


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

    }

    // ─── STEP 3: Auto-run setup/init on the tenant site to seed default data ────
    // This provisions: Price List, Territories, Modes of Payment, Customer Groups, Item Groups
    try {
      const initUrl = `${siteUrl}/api/setup/init`
      const initResponse = await fetch(initUrl, {
        method: 'GET',
        headers: {
          // Pass tenant API credentials so frappeRequest uses the right site
          'x-tenant-api-key': apiKey,
          'x-tenant-api-secret': apiSecret,
        },
        // Don't hang the response — fire and check quickly
        signal: AbortSignal.timeout(30000)
      })
      if (initResponse.ok) {
        const initData = await initResponse.json()
      } else {
      }
    } catch (initErr: any) {
      // Non-fatal — tenant works fine, init can be re-run manually
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
