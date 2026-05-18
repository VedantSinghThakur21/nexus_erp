export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

export type ModelPolicy = {
  plan: 'pro' | 'enterprise'
  model: string
  maxContextTokens: number
}

export type ModelResult = {
  response: string
  toolCalls: Array<{ toolName: string; input: unknown }>
  inputTokens: number
  outputTokens: number
  latencyMs: number
  stopReason: string
}

export type AgenticModelError = {
  code: 'MODEL_UNAVAILABLE'
  message: string
}
