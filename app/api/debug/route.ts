import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

/**
 * Debug endpoint to check middleware headers and routing
 * Access: https://avariq.in/api/debug or https://tesla.avariq.in/api/debug
 */
export async function GET(request: NextRequest) {
  const headersList = await headers()
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    url: request.url,
    hostname: headersList.get('host'),
    tenantId: headersList.get('x-tenant-id'),
    currentPath: headersList.get('x-current-path'),
    userAgent: headersList.get('user-agent'),
    allHeaders: Object.fromEntries(headersList.entries()),
  })
}
