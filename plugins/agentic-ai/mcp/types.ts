import type { AgenticFeatureFlag } from '../types'

export type MCPToolClassification = 'read' | 'write' | 'destructive'

export type MCPToolName =
  | 'crm.search_leads'
  | 'crm.create_lead'
  | 'crm.update_lead'
  | 'quotes.get_quotation'
  | 'quotes.create_quotation'
  | 'inventory.get_item_availability'
  | 'pricing.calculate_rental_pricing'
  | 'invoices.get_invoice'
  | 'invoices.create_invoice'
  | 'payments.record_payment'
  | 'tasks.create_follow_up_task'

export type MCPTool = {
  name: MCPToolName
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  requiredPlan: 'pro' | 'enterprise'
  requiredFlag?: AgenticFeatureFlag
  requiresApproval: boolean
  classification: MCPToolClassification
  dryRunSupported: boolean
}

export type MCPToolCall = {
  name: MCPToolName
  input: Record<string, unknown>
}

export type MCPToolResult = {
  ok: boolean
  data?: unknown
  error?: string
  dryRun?: boolean
}

