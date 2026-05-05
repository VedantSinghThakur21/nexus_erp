import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/api'

const ANALYTICS_API_URL = process.env.NEXT_PUBLIC_ANALYTICS_API_URL || 'http://localhost:8003'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, tenant } = body

    if (!query || !tenant) {
      return NextResponse.json(
        { error: 'Missing query or tenant in request body' },
        { status: 400 }
      )
    }

    // Securely retrieve the user's ERPNext API credentials from cookies/session
    const tenantContext = await getTenantContext()

    if (!tenantContext.hasCredentials) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing ERPNext API credentials for this tenant.' },
        { status: 401 }
      )
    }

    // Forward the request to the Conversational Analytics FastAPI backend,
    // injecting the secure credentials. The browser never sees these keys.
    const backendRes = await fetch(`${ANALYTICS_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        tenant: tenant,
        api_key: tenantContext.apiKey,
        api_secret: tenantContext.apiSecret,
      }),
    })

    if (!backendRes.ok) {
      const errorText = await backendRes.text()
      console.error('[Analytics Proxy] Backend error:', backendRes.status, errorText)
      return NextResponse.json(
        { error: 'Analytics backend failed to process request.' },
        { status: backendRes.status }
      )
    }

    const data = await backendRes.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('[Analytics Proxy] Internal error:', error)
    return NextResponse.json(
      { error: 'Internal server error while processing analytics request.' },
      { status: 500 }
    )
  }
}
