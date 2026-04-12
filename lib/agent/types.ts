export type AgentLifecycleEvent = 'observe' | 'decide' | 'act' | 'confirm'

export type AgentActionType =
  | 'follow_up_scan'
  | 'stale_lead_scan'
  | 'overdue_invoice_scan'
  | 'manual'

export type AgentActionStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'failed'

export type AgentToolName =
  | 'get_lead'
  | 'update_lead'
  | 'get_quotation'
  | 'create_follow_up_task'
  | 'get_invoice'

export interface AgentTenantContext {
  tenantId: string
  siteName: string
}

export interface AgentToolCall {
  name: AgentToolName
  input: Record<string, unknown>
}

export interface AgentSuggestedAction {
  title: string
  reason: string
  confidence: number
  toolCall: AgentToolCall
}

export interface AgentRunContext {
  objective: string
  observation?: string
  jobType: AgentActionType
}

export interface AgentRunResult {
  summary: string
  observations: string[]
  suggestedActions: AgentSuggestedAction[]
}

export interface AgentActionLogDoc {
  doctype: 'Agent Action Log'
  name?: string
  tenant: string
  action_type: AgentActionType
  status: AgentActionStatus
  triggered_by: string
  payload: string
  result?: string
  approved_by?: string
  rolled_back?: 0 | 1
}

export interface AgentJobPayload {
  tenant: AgentTenantContext
  triggeredBy: string
  jobType: AgentActionType
  objective?: string
}

export interface AgentToolExecutionResult {
  ok: boolean
  data?: unknown
  error?: string
}
