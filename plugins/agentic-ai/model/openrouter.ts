import { AGENTIC_CONFIG, getModelPolicy, type ModelPolicy } from '../config'
import type { MCPTool } from '../mcp/types'
import { fromApiToolName, toApiToolName } from './tool-names'
import type { AgenticPlan } from '../types'
import type { AgenticModelError, ChatMessage, ModelResult } from './types'

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

/**
 * Calls OpenRouter with tool definitions. Retries once on 5xx with lower max_tokens.
 */
export async function runWithModel(opts: {
  plan: 'pro' | 'enterprise'
  messages: ChatMessage[]
  tools: MCPTool[]
  systemPrompt: string
  tenantId: string
}): Promise<ModelResult> {
  const policy = AGENTIC_CONFIG.modelPolicies[opts.plan]
  const start = Date.now()
  const apiKey = AGENTIC_CONFIG.openRouterApiKey
  if (!apiKey) {
    const error: AgenticModelError = { code: 'MODEL_UNAVAILABLE', message: 'OPENROUTER_API_KEY is not configured' }
    throw error
  }

  const toolDefs = opts.tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: toApiToolName(t.name),
      description: t.description,
      parameters: t.inputSchema,
    },
  }))

  const body = {
    model: policy.model,
    max_tokens: 4096,
    messages: [{ role: 'system', content: opts.systemPrompt }, ...opts.messages],
    tools: toolDefs.length > 0 ? toolDefs : undefined,
    tool_choice: toolDefs.length > 0 ? ('auto' as const) : undefined,
    temperature: 0.2,
  }

  async function attempt(maxTokens: number): Promise<Response> {
    return fetch(`${AGENTIC_CONFIG.openRouterBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': AGENTIC_CONFIG.appUrl,
        'X-Title': AGENTIC_CONFIG.appName,
      },
      body: JSON.stringify({ ...body, max_tokens: maxTokens }),
      cache: 'no-store',
    })
  }

  let res: Response
  try {
    res = await attempt(4096)
    if (!res.ok && res.status >= 500) {
      res = await attempt(2048)
    }
  } catch {
    try {
      res = await attempt(2048)
    } catch {
      const error: AgenticModelError = {
        code: 'MODEL_UNAVAILABLE',
        message: 'OpenRouter API unreachable after retry',
      }
      throw error
    }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const detail = body ? body.slice(0, 280) : ''
    const error: AgenticModelError = {
      code: 'MODEL_UNAVAILABLE',
      message: detail
        ? `OpenRouter returned ${res.status}: ${detail}`
        : `OpenRouter returned ${res.status}`,
    }
    throw error
  }

  const data = (await res.json()) as {
    choices: Array<{
      message: {
        content: string | null
        tool_calls?: Array<{ function: { name: string; arguments: string } }>
      }
      finish_reason: string
    }>
    usage: { prompt_tokens: number; completion_tokens: number }
  }

  const choice = data.choices[0]
  const toolCalls = (choice.message.tool_calls ?? []).map((tc) => {
    const apiName = tc.function.name
    const canonical = fromApiToolName(apiName) ?? apiName
    let input: unknown = {}
    try {
      input = JSON.parse(tc.function.arguments || '{}') as unknown
    } catch {
      input = {}
    }
    return {
      toolName: canonical,
      input,
    }
  })

  return {
    response: choice.message.content ?? '',
    toolCalls,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    latencyMs: Date.now() - start,
    stopReason: choice.finish_reason,
  }
}

async function callOpenRouter(model: string, messages: ChatMessage[]): Promise<string> {
  const apiKey = AGENTIC_CONFIG.openRouterApiKey
  if (!apiKey) {
    throw new OpenRouterError('missing_api_key', 'OPENROUTER_API_KEY is not configured')
  }

  const response = await fetch(`${AGENTIC_CONFIG.openRouterBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': AGENTIC_CONFIG.appUrl,
      'X-Title': AGENTIC_CONFIG.appName,
    },
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
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

  const data = (await response.json().catch(() => ({}))) as {
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
