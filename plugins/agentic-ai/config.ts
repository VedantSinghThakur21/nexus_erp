import type { AgenticFeatureFlag, AgenticPlan } from './types'

function trimEnv(name: string): string {
  return (process.env[name] || '').trim().replace(/^['"]|['"]$/g, '')
}

const OPENROUTER_KEY_ENV_NAMES = [
  'OPENROUTER_API_KEY',
  'OPEN_ROUTER_API_KEY',
  'OPENROUTER_KEY',
] as const

export type OpenRouterKeySource =
  | (typeof OPENROUTER_KEY_ENV_NAMES)[number]
  | 'OPENAI_API_KEY'
  | null

/** Where the OpenRouter key was resolved from (for diagnostics only). */
export function getOpenRouterKeySource(): OpenRouterKeySource {
  for (const name of OPENROUTER_KEY_ENV_NAMES) {
    if (trimEnv(name)) return name
  }
  const openAi = trimEnv('OPENAI_API_KEY')
  if (openAi.startsWith('sk-or-')) return 'OPENAI_API_KEY'
  return null
}

function resolveOpenRouterApiKey(): string {
  for (const name of OPENROUTER_KEY_ENV_NAMES) {
    const value = trimEnv(name)
    if (value) return value
  }
  const openAi = trimEnv('OPENAI_API_KEY')
  if (openAi.startsWith('sk-or-')) return openAi
  return ''
}

export const AGENTIC_CONFIG = {
  get openRouterApiKey(): string {
    return resolveOpenRouterApiKey()
  },
  openRouterBaseUrl: 'https://openrouter.ai/api/v1',
  modelPolicies: {
    pro: {
      plan: 'pro' as const,
      model: process.env.OPENROUTER_MODEL ?? process.env.OPENROUTER_AGENT_MODEL ?? 'anthropic/claude-3-haiku',
      maxContextTokens: 32_000,
    },
    enterprise: {
      plan: 'enterprise' as const,
      model:
        process.env.OPENROUTER_MODEL ??
        process.env.OPENROUTER_ENTERPRISE_AGENT_MODEL ??
        process.env.OPENROUTER_AGENT_MODEL ??
        'anthropic/claude-3-haiku',
      maxContextTokens: 128_000,
    },
  },
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'https://avariq.in',
  appName: 'Nexus ERP',
  redis: {
    url: process.env.REDIS_URL ?? '',
  },
  rateLimits: {
    chat: { requests: 30, windowMs: 60_000 },
    runs: { requests: 10, windowMs: 60_000 },
    actions: { requests: 20, windowMs: 60_000 },
  },
}

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

