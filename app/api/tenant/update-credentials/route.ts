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

    // Update the SaaS Tenant record in master database
    const updateEndpoint = `${BASE_URL}/api/resource/SaaS Tenant/${tenantName}`
    
    console.log(`Updating tenant ${tenantName} with API credentials...`)

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

    console.log(`✅ Tenant ${tenantName} API credentials updated successfully`)

    return NextResponse.json({
      success: true,
      message: 'Tenant API credentials updated successfully'
    })

  } catch (error: any) {
    console.error('Error in update-credentials API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
