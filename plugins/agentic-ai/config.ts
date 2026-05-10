import type { AgenticFeatureFlag, AgenticPlan } from './types'

export const AGENTIC_BASE_FLAG: AgenticFeatureFlag = 'agentic_ai_enabled'
export const AGENTIC_FINANCE_FLAG: AgenticFeatureFlag = 'agentic_finance_enabled'
export const AGENTIC_DESTRUCTIVE_FLAG: AgenticFeatureFlag = 'agentic_destructive_tools_enabled'

export const AGENTIC_ALLOWED_PLANS: AgenticPlan[] = ['pro', 'enterprise']

export type ModelPolicy = {
  plan: Extract<AgenticPlan, 'pro' | 'enterprise'>
  model: string
  maxContextTokens: number
  fallbackModel?: string
}

export const MODEL_POLICIES: Record<'pro' | 'enterprise', ModelPolicy> = {
  pro: {
    plan: 'pro',
    model: process.env.OPENROUTER_AGENT_MODEL || 'openai/gpt-4o-mini',
    fallbackModel: process.env.OPENROUTER_AGENT_FALLBACK_MODEL || 'anthropic/claude-3.5-haiku',
    maxContextTokens: Number(process.env.OPENROUTER_AGENT_MAX_CONTEXT_TOKENS || '12000'),
  },
  enterprise: {
    plan: 'enterprise',
    model: process.env.OPENROUTER_ENTERPRISE_AGENT_MODEL || process.env.OPENROUTER_AGENT_MODEL || 'anthropic/claude-3.5-sonnet',
    fallbackModel:
      process.env.OPENROUTER_ENTERPRISE_AGENT_FALLBACK_MODEL ||
      process.env.OPENROUTER_AGENT_FALLBACK_MODEL ||
      'openai/gpt-4o',
    maxContextTokens: Number(process.env.OPENROUTER_ENTERPRISE_AGENT_MAX_CONTEXT_TOKENS || '32000'),
  },
}

export function normalizePlan(plan: unknown): AgenticPlan {
  const normalized = String(plan || 'free').toLowerCase()
  if (normalized === 'pro' || normalized === 'enterprise') return normalized
  return 'free'
}

export function getModelPolicy(plan: AgenticPlan): ModelPolicy {
  return MODEL_POLICIES[plan === 'enterprise' ? 'enterprise' : 'pro']
}

