import type { MCPToolName } from '../mcp/types'

/**
 * Some OpenRouter providers (e.g. Anthropic) require function names to match
 * ^[a-zA-Z0-9_-]{1,64} with a short max length — dots are rejected.
 * We expose ≤6-char aliases to the model and map back to canonical MCP names.
 */
export const MCP_TOOL_API_ALIASES: Record<MCPToolName, string> = {
  'crm.search_leads': 'srchld',
  'crm.create_lead': 'crtld',
  'crm.update_lead': 'updld',
  'quotes.get_quotation': 'getquo',
  'quotes.create_quotation': 'mkquot',
  'inventory.get_item_availability': 'invavl',
  'pricing.calculate_rental_pricing': 'calcpr',
  'invoices.get_invoice': 'getinv',
  'invoices.create_invoice': 'mkinv',
  'payments.record_payment': 'payrec',
  'tasks.create_follow_up_task': 'foltsk',
}

const API_TO_CANONICAL = Object.fromEntries(
  Object.entries(MCP_TOOL_API_ALIASES).map(([canonical, api]) => [api, canonical])
) as Record<string, MCPToolName>

export function toApiToolName(canonical: string): string {
  return MCP_TOOL_API_ALIASES[canonical as MCPToolName] ?? sanitizeToolNameForApi(canonical)
}

export function fromApiToolName(apiName: string): MCPToolName | null {
  if (API_TO_CANONICAL[apiName]) return API_TO_CANONICAL[apiName]
  if (apiName in MCP_TOOL_API_ALIASES) return apiName as MCPToolName
  return null
}

/** Fallback: strip dots and truncate (last resort for unknown tools). */
function sanitizeToolNameForApi(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 6)
  return base || 'tool'
}

export function resolveCanonicalToolName(name: string): string {
  return fromApiToolName(name) ?? name
}
