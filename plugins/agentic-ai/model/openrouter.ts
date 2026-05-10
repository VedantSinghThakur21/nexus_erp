import { getModelPolicy, type ModelPolicy } from '../config'
import type { AgenticPlan } from '../types'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type ModelCompletionResult = {
  text: string
  model: string
  fallbackUsed: boolean
  latencyMs: number
}

export class OpenRouterError extends Error {
  code: string
  status?: number

  constructor(code: string, message: string, status?: number) {
    super(message)
    this.name = 'OpenRouterError'
    this.code = code
    this.status = status
  }
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500
}

async function callOpenRouter(model: string, messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new OpenRouterError('missing_api_key', 'OPENROUTER_API_KEY is not configured')
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || process.env.PLAYWRIGHT_BASE_URL || 'https://avariq.in',
      'X-Title': 'Nexus ERP Agentic AI',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new OpenRouterError(
      isTransientStatus(response.status) ? 'transient_model_error' : 'model_error',
      body || `OpenRouter request failed with status ${response.status}`,
      response.status
    )
  }

  const data = await response.json().catch(() => ({})) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new OpenRouterError('empty_model_response', 'OpenRouter returned an empty response')
  return text
}

export async function completeWithOpenRouter(
  plan: AgenticPlan,
  messages: ChatMessage[],
  policy: ModelPolicy = getModelPolicy(plan)
): Promise<ModelCompletionResult> {
  const startedAt = Date.now()

  try {
    const text = await callOpenRouter(policy.model, messages)
    return {
      text,
      model: policy.model,
      fallbackUsed: false,
      latencyMs: Date.now() - startedAt,
    }
  } catch (error) {
    if (!(error instanceof OpenRouterError) || !policy.fallbackModel || error.code === 'missing_api_key') {
      throw error
    }

    const text = await callOpenRouter(policy.fallbackModel, messages)
    return {
      text,
      model: policy.fallbackModel,
      fallbackUsed: true,
      latencyMs: Date.now() - startedAt,
    }
  }
}

