import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
const API_KEY = process.env.ERP_API_KEY
const API_SECRET = process.env.ERP_API_SECRET

/**
 * API endpoint for provision script to update tenant API credentials
 * POST /api/tenant/update-credentials
 * Body: { tenantName, apiKey, apiSecret }
 */
export async function POST(request: NextRequest) {
  try {
    const { tenantName, apiKey, apiSecret } = await request.json()

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

    console.log(`Searching for tenant with subdomain: ${tenantName}`)

    // First, find the tenant record by subdomain field
    const searchEndpoint = `${BASE_URL}/api/method/frappe.client.get_list`
    const searchResponse = await fetch(searchEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    })
    
    const searchParams = new URLSearchParams({
      doctype: 'SaaS Tenant',
      filters: JSON.stringify([['subdomain', '=', tenantName]]),
      fields: JSON.stringify(['name']),
      limit_page_length: '1'
    })

    const searchUrl = `${BASE_URL}/api/method/frappe.client.get_list?${searchParams}`
    
    const findResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    })

    if (!findResponse.ok) {
      console.error('Failed to search for tenant:', await findResponse.text())
      return NextResponse.json(
        { error: 'Failed to find tenant record' },
        { status: 404 }
      )
    }

    const findData = await findResponse.json()
    const tenants = findData.message || []

    if (tenants.length === 0) {
      console.error(`No tenant found with subdomain: ${tenantName}`)
      return NextResponse.json(
        { error: `Tenant with subdomain '${tenantName}' not found` },
        { status: 404 }
      )
    }

    const tenantRecordName = tenants[0].name
    console.log(`Found tenant record: ${tenantRecordName}`)

    // Update the SaaS Tenant record in master database using the actual record name
    const updateEndpoint = `${BASE_URL}/api/resource/SaaS Tenant/${tenantRecordName}`
    
    console.log(`Updating tenant ${tenantRecordName} with API credentials...`)

    const updateResponse = await fetch(updateEndpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        api_key: apiKey,
        api_secret: apiSecret
      }),
    })

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json()
      console.error('Failed to update tenant:', errorData)
      return NextResponse.json(
        { error: errorData.message || 'Failed to update tenant record' },
        { status: updateResponse.status }
      )
    }

    console.log(`✅ Tenant ${tenantRecordName} API credentials updated successfully`)

    return NextResponse.json({
      success: true,
      message: 'Tenant API credentials updated successfully',
      tenantRecord: tenantRecordName
    })

  } catch (error: any) {
    console.error('Error in update-credentials API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
