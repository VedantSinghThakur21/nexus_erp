import type { AnalyticsResponse } from '@/lib/analyticsApi'
import type { MCPToolResult } from './mcp/types'

export type ToolChatPayload = {
  summary: string
  display?: AnalyticsResponse
}

type Row = Record<string, unknown>

function tableFromRows(
  title: string,
  columns: string[],
  rows: Row[],
  maxRows = 50
): AnalyticsResponse {
  const slice = rows.slice(0, maxRows)
  return {
    type: 'table',
    title,
    columns,
    rows: slice.map((row) => columns.map((col) => row[col] ?? null)),
    exportable: true,
    note: rows.length > maxRows ? `showing ${maxRows} of ${rows.length}` : undefined,
  }
}

const TOOL_TABLES: Record<string, { title: string; columns: string[] }> = {
  'crm.search_leads': {
    title: 'Leads',
    columns: ['lead_name', 'status', 'company_name', 'email_id', 'mobile_no', 'name'],
  },
  'inventory.get_item_availability': {
    title: 'Stock availability',
    columns: ['item_code', 'warehouse', 'actual_qty', 'projected_qty', 'reserved_qty'],
  },
}

export function buildToolChatPayload(toolName: string, result: MCPToolResult): ToolChatPayload {
  if (!result.success) {
    return {
      summary: '',
      display: {
        type: 'error',
        message: result.error || "I couldn't pull that from your CRM right now. Please try again.",
      },
    }
  }

  const data = result.data
  const spec = TOOL_TABLES[toolName]

  if (spec && Array.isArray(data)) {
    const rows = data as Row[]
    if (rows.length === 0) {
      return {
        summary: '',
        display: {
          type: 'info',
          message: emptyMessageForTool(toolName),
        },
      }
    }
    return {
      summary: '',
      display: tableFromRows(spec.title, spec.columns, rows),
    }
  }

  if (Array.isArray(data)) {
    const rows = data as Row[]
    if (rows.length === 0) {
      return {
        summary: '',
        display: { type: 'info', message: "That search didn't return any records." },
      }
    }
    const columns = Object.keys(rows[0] ?? {}).slice(0, 8)
    return {
      summary: '',
      display: tableFromRows('Results', columns, rows),
    }
  }

  if (data && typeof data === 'object') {
    const row = data as Row
    const columns = Object.keys(row).slice(0, 10)
    return {
      summary: '',
      display: tableFromRows('Details', columns, [row]),
    }
  }

  return {
    summary: 'Done — I pulled the latest data from your CRM.',
  }
}

/** @deprecated use buildToolChatPayload */
export function formatToolResultForChat(toolName: string, result: MCPToolResult): string {
  const payload = buildToolChatPayload(toolName, result)
  if (payload.display) {
    if (payload.display.type === 'info') return payload.display.message
    if (payload.display.type === 'error') return payload.display.message
    if (payload.display.type === 'table') {
      return payload.display.title
        ? `${payload.display.title}: ${payload.display.rows.length} record(s)`
        : `Found ${payload.display.rows.length} record(s).`
    }
  }
  return payload.summary
}

function emptyMessageForTool(toolName: string): string {
  switch (toolName) {
    case 'crm.search_leads':
      return "I checked your CRM and didn't find any leads matching that."
    case 'inventory.get_item_availability':
      return 'No stock records matched that item or warehouse.'
    default:
      return "That search didn't return any records."
  }
}
