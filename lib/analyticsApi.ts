/**
 * Analytics API Client
 * ====================
 * Typed client for the Conversational Analytics FastAPI service.
 * 
 * The service runs at NEXT_PUBLIC_ANALYTICS_API_URL and is called
 * directly from the browser (client component). Tenant is injected
 * from the hostname via useClientTenant().
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TableResponse = {
  type: 'table'
  columns: string[]
  rows: any[][]
  exportable: true
  note?: string
  insight?: AnalyticsInsight
}

export type NumberResponse = {
  type: 'number'
  value: number
  label: string
}

export type ErrorResponse = {
  type: 'error'
  message: string
  suggestions?: string[]
}

export type InfoResponse = {
  type: 'info'
  message: string
  insight?: AnalyticsInsight
}

export type AnalyticsInsight =
  | {
      kind: 'invoices'
      total_count: number
      total_amount: number | null
      unpaid_count: number
      unpaid_amount: number | null
      overdue_count: number
      aging_buckets: Record<'0-30' | '31-60' | '61-90' | '90+', number>
      top_debtors: { customer: string; amount: number }[]
      anomalies: { name?: string; customer?: string; amount?: number; z_score?: number }[]
    }
  | {
      kind: 'sales_orders'
      total_count: number
      total_amount: number | null
      status_breakdown: Record<string, number>
      docstatus_breakdown: Record<string, number>
    }
  | {
      kind: 'customers'
      total_count: number
      customer_groups: { name: string; count: number }[]
      territories: { name: string; count: number }[]
    }

export type AnalyticsResponse =
  | TableResponse
  | NumberResponse
  | ErrorResponse
  | InfoResponse

export interface ChatApiResponse {
  query: string
  tenant: string
  tool_used: string | null
  intent_source: string
  response: AnalyticsResponse
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

const ANALYTICS_API_URL =
  process.env.NEXT_PUBLIC_ANALYTICS_API_URL || 'http://localhost:8003'

/**
 * Send a natural language query to the Conversational Analytics backend.
 * This now goes through our secure Next.js proxy route to inject credentials.
 *
 * @param query  - The user's natural language question
 * @param tenant - The tenant subdomain (from useClientTenant)
 * @returns Typed analytics response
 */
export async function askAnalytics(
  query: string,
  tenant: string
): Promise<ChatApiResponse> {
  const url = `/api/analytics/chat`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, tenant }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new Error(`Analytics API error (${res.status}): ${text}`)
  }

  return res.json() as Promise<ChatApiResponse>
}
