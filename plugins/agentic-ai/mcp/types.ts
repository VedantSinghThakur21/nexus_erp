import type { AgenticFeatureFlag } from '../types'

export type ToolClassification = 'read' | 'write' | 'destructive'

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

export type MCPToolClassification = ToolClassification

export type MCPTool<TInput = unknown, TOutput = unknown> = {
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
  classification: ToolClassification
  supportsDryRun: boolean
  auditPayloadShape: string[]
  execute: (input: TInput, context: ToolContext) => Promise<MCPToolResult<TOutput>>
  dryRun?: (input: TInput, context: ToolContext) => Promise<MCPDryRunResult>
}

export type ToolContext = {
  tenantId: string
  userId: string
  runId: string
  frappe: (method: string, path: string, body?: unknown) => Promise<unknown>
}

export type MCPToolResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
  idempotencyKey: string
  dryRun?: boolean
  ok?: boolean
}

export type MCPDryRunResult = {
  preview: string
  affectedRecords: string[]
  estimatedImpact: 'low' | 'medium' | 'high'
}

export type ProposedAction = {
  id: string
  toolName: string
  input: unknown
  dryRunResult: MCPDryRunResult
  runId: string
  tenantId: string
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed'
  expiresAt: Date
}

export type MCPToolCall = {
  name: MCPToolName
  input: Record<string, unknown>
}

/** @deprecated use MCPToolResult.success */
export type LegacyMCPToolResult = {
  ok: boolean
  data?: unknown
  error?: string
  dryRun?: boolean
}
