export type AgenticPlan = 'free' | 'pro' | 'enterprise'

export type AgenticFeatureFlag =
  | 'agentic_ai_enabled'
  | 'agentic_finance_enabled'
  | 'agentic_destructive_tools_enabled'

export type AgenticMode = 'chat' | 'plan' | 'act'

export type AgenticActionStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'failed'

export interface AgenticTenantContext {
  tenantId: string
  siteName: string
  plan: AgenticPlan
  flags: Partial<Record<AgenticFeatureFlag, boolean>>
  status?: string
}

export interface AgenticUserContext {
  email: string
  roles: string[]
}

export interface AgenticEntitlement {
  allowed: boolean
  plan: AgenticPlan
  tenantId: string
  flags: Partial<Record<AgenticFeatureFlag, boolean>>
  reason?: string
}

export interface AgenticRunMetadata {
  model?: string
  fallbackUsed?: boolean
  latencyMs?: number
  contextCount?: number
  inputTokens?: number
  outputTokens?: number
}

export interface AgenticChatResult {
  answer: string
  citations: Array<{ title: string; citation?: string }>
  metadata: AgenticRunMetadata
}

