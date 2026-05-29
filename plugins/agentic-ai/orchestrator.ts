import { randomBytes } from 'crypto'
import { getModelPolicy } from './config'
import { evaluateAgenticEntitlement, getAgenticEntitlement, getAgenticTenantContext } from './entitlements'
import { writeAudit } from './audit'
import { createPendingAgenticAction } from './audit'
import { completeWithOpenRouter, OpenRouterError, runWithModel } from './model/openrouter'
import { toApiToolName } from './model/tool-names'
import type { ChatMessage } from './model/types'
import { executeMcpTool } from './mcp/executor'
import { getMcpTool, listMcpToolsForTenant, registry } from './mcp/registry'
import { buildToolContext } from './mcp/tool-runtime'
import type { MCPToolCall, ProposedAction } from './mcp/types'
import { formatContextForPrompt, retrieve } from './rag/retriever'
import type { RetrievedContext } from './rag/types'
import type { AgenticChatResult, AgenticEntitlement, AgenticMode } from './types'

function newRunId(): string {
  return randomBytes(8).toString('hex')
}

export type AgenticRunInput = {
  mode: AgenticMode
  userMessage: string
  tenantId: string
  userId: string
  conversationHistory: ChatMessage[]
  entitlement: AgenticEntitlement & { allowed: true }
}

export type AgenticRunOutput = {
  runId: string
  mode: AgenticMode
  response: string
  retrievedContext: RetrievedContext[]
  proposedActions: ProposedAction[]
  pendingApprovals: string[]
  modelMetadata: {
    model: string
    inputTokens: number
    outputTokens: number
    latencyMs: number
  }
  auditId: string
}

function buildSystemPrompt(
  tenantId: string,
  contextBlock: string,
  mode: AgenticMode,
  toolNames: string[]
): string {
  return [
    `You are the Nexus ERP AI Agent for tenant ${tenantId}.`,
    'You help sales, operations, and management teams work faster.',
    contextBlock ? `Context from the tenant's ERP:\n${contextBlock}` : 'No relevant retrieved context.',
    `You have access to these tools (api_name=canonical): ${
      toolNames.map((n) => `${toApiToolName(n)}=${n}`).join(', ') || 'none'
    }`,
    `Current mode: ${mode}`,
    "- In 'chat' mode: answer questions using read tools only. Do not execute writes.",
    "- In 'plan' mode: propose actions as a plan. Do not execute anything.",
    "- In 'act' mode: execute read tools immediately. For write/destructive tools, create pending approval.",
  ].join('\n\n')
}

export async function runAgenticWorkflow(input: AgenticRunInput): Promise<AgenticRunOutput> {
  const runId = newRunId()
  const plan = input.entitlement.plan === 'enterprise' ? 'enterprise' : 'pro'
  const retrievedContext = await retrieve(input.userMessage, input.tenantId)
  const contextBlock = formatContextForPrompt(retrievedContext)
  const entitledTools = registry.listEntitled(input.entitlement)
  const toolContext = buildToolContext(input.tenantId, input.userId, runId)

  const proposedActions: ProposedAction[] = []
  const pendingApprovals: string[] = []
  let response = ''
  let modelMetadata = { model: getModelPolicy(plan).model, inputTokens: 0, outputTokens: 0, latencyMs: 0 }
  let auditId = ''

  await writeAudit(
    {
      tenantId: input.tenantId,
      userId: input.userId,
      runId,
      event: 'run.started',
      payload: { mode: input.mode, contextCount: retrievedContext.length },
      outcome: 'pending',
    },
    input.tenantId
  ).catch(() => undefined)

  try {
    const messages: ChatMessage[] = [
      ...input.conversationHistory.filter((m) => m.role !== 'system'),
      { role: 'user', content: input.userMessage },
    ]

    const modelResult = await runWithModel({
      plan,
      messages,
      tools: entitledTools,
      systemPrompt: buildSystemPrompt(
        input.tenantId,
        contextBlock,
        input.mode,
        entitledTools.map((t) => t.name)
      ),
      tenantId: input.tenantId,
    })

    modelMetadata = {
      model: getModelPolicy(plan).model,
      inputTokens: modelResult.inputTokens,
      outputTokens: modelResult.outputTokens,
      latencyMs: modelResult.latencyMs,
    }

    response = modelResult.response
    const notes: string[] = []

    for (const call of modelResult.toolCalls) {
      const tool = getMcpTool(call.toolName as MCPToolCall['name'])
      if (!tool) continue

      if (input.mode === 'chat' && tool.classification !== 'read') {
        notes.push(`I can propose "${tool.name}" in Plan or Act mode.`)
        continue
      }

      if (input.mode === 'plan') {
        const dry = tool.dryRun
          ? await tool.dryRun(call.input, toolContext)
          : { preview: `Would run ${tool.name}`, affectedRecords: [], estimatedImpact: 'low' as const }
        proposedActions.push({
          id: newRunId(),
          toolName: tool.name,
          input: call.input,
          dryRunResult: dry,
          runId,
          tenantId: input.tenantId,
          status: 'pending',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        continue
      }

      if (input.mode === 'act') {
        if (tool.classification === 'read' || (!tool.requiresApproval && tool.classification === 'write')) {
          const result = await tool.execute(call.input, toolContext)
          await writeAudit(
            {
              tenantId: input.tenantId,
              userId: input.userId,
              runId,
              event: result.success ? 'tool.succeeded' : 'tool.failed',
              toolName: tool.name,
              classification: tool.classification,
              payload: { idempotencyKey: result.idempotencyKey },
              outcome: result.success ? 'success' : 'failure',
            },
            input.tenantId
          ).catch(() => undefined)
          continue
        }

        if (tool.requiresApproval) {
          const dry = tool.dryRun
            ? await tool.dryRun(call.input, toolContext)
            : { preview: `Would run ${tool.name}`, affectedRecords: [], estimatedImpact: 'medium' as const }
          const pending = await createPendingAgenticAction({
            toolCall: { name: tool.name, input: call.input as Record<string, unknown> },
            dryRun: { ok: true, success: true, data: dry, idempotencyKey: '' },
            createdBy: input.userId,
            idempotencyKey: resultIdempotency(tool.name, call.input, runId),
          })
          if (pending.ok && pending.action?.id) {
            pendingApprovals.push(pending.action.id)
          }
        }
      }
    }

    if (notes.length > 0) {
      response = [response, ...notes].filter(Boolean).join('\n\n')
    }

    auditId = await writeAudit(
      {
        tenantId: input.tenantId,
        userId: input.userId,
        runId,
        event: 'run.completed',
        payload: {
          inputTokens: modelMetadata.inputTokens,
          outputTokens: modelMetadata.outputTokens,
          toolCalls: modelResult.toolCalls.length,
        },
        outcome: 'success',
      },
      input.tenantId
    ).catch(() => '')
  } catch (error) {
    await writeAudit(
      {
        tenantId: input.tenantId,
        userId: input.userId,
        runId,
        event: 'run.failed',
        payload: { code: error instanceof OpenRouterError ? error.code : 'unknown' },
        outcome: 'failure',
      },
      input.tenantId
    ).catch(() => undefined)
    throw error
  }

  return {
    runId,
    mode: input.mode,
    response,
    retrievedContext,
    proposedActions,
    pendingApprovals,
    modelMetadata,
    auditId: auditId || runId,
  }
}

function resultIdempotency(toolName: string, input: unknown, runId: string): string {
  return `${toolName}:${runId}:${JSON.stringify(input)}`
}

export async function runAgenticChat(input: {
  message: string
  mode?: AgenticMode
  userId?: string
}): Promise<{ ok: boolean; result?: AgenticChatResult; entitlement?: unknown; error?: string; status?: number }> {
  const entitlement = await getAgenticEntitlement()
  if (!entitlement.allowed) {
    return { ok: false, entitlement, error: entitlement.reason, status: 403 }
  }

  const tenant = await getAgenticTenantContext()
  const mode = input.mode || 'chat'

  try {
    const workflow = await runAgenticWorkflow({
      mode,
      userMessage: input.message,
      tenantId: tenant.tenantId,
      userId: input.userId || 'current_user',
      conversationHistory: [],
      entitlement: entitlement as AgenticEntitlement & { allowed: true },
    })

    return {
      ok: true,
      result: {
        answer: workflow.response,
        citations: workflow.retrievedContext.map((item) => ({
          title: item.title,
          citation: item.citation,
        })),
        metadata: {
          model: workflow.modelMetadata.model,
          latencyMs: workflow.modelMetadata.latencyMs,
          contextCount: workflow.retrievedContext.length,
          inputTokens: workflow.modelMetadata.inputTokens,
          outputTokens: workflow.modelMetadata.outputTokens,
        },
      },
    }
  } catch (error) {
    if (error instanceof OpenRouterError && error.code === 'missing_api_key') {
      const retrievedContext = await retrieve(input.message, tenant.tenantId)
      return {
        ok: true,
        result: {
          answer: offlineAgenticAnswer(input.message, retrievedContext.length),
          citations: retrievedContext.map((item) => ({
            title: item.title,
            citation: item.citation,
          })),
          metadata: { model: 'offline', contextCount: retrievedContext.length },
        },
      }
    }

    const agenticModelError = error as { code?: string; message?: string }
    if (agenticModelError?.code === 'MODEL_UNAVAILABLE') {
      const msg = agenticModelError.message || 'Model unavailable'
      const friendly = msg.includes('not configured')
        ? 'OPENROUTER_API_KEY is missing in nexus_erp/.env.local (project root). Add OPENROUTER_API_KEY=sk-or-v1-... — not OPENAI_API_KEY (sk-proj). Restart npm run dev or PM2.'
        : msg.includes('OpenRouter returned 401') || msg.includes('OpenRouter returned 403')
          ? 'OpenRouter rejected the API key (invalid or expired). Use a key from https://openrouter.ai/keys in OPENROUTER_API_KEY.'
          : msg.includes('OpenRouter returned 402')
            ? 'OpenRouter credits exhausted. Add credits at https://openrouter.ai/credits'
            : msg
      return { ok: false, error: friendly, status: 502 }
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Agentic model request failed',
      status: 502,
    }
  }
}

function offlineAgenticAnswer(message: string, contextCount: number): string {
  return [
    'Agentic AI is configured, but live model access is not available yet.',
    `Your request: "${message}".`,
    contextCount > 0
      ? `Found ${contextCount} context item(s). Set OPENROUTER_API_KEY for grounded responses.`
      : 'Configure OPENROUTER_API_KEY for richer answers.',
  ].join(' ')
}

export async function createAgenticRun(input: {
  toolCall: MCPToolCall
  requestedBy?: string
}): Promise<{
  ok: boolean
  action?: unknown
  dryRun?: unknown
  result?: unknown
  error?: string
  status?: number
  setupRequired?: boolean
}> {
  const entitlement = await getAgenticEntitlement()
  if (!entitlement.allowed) {
    return { ok: false, error: entitlement.reason, status: 403 }
  }

  const tenant = await getAgenticTenantContext()
  const tool = getMcpTool(input.toolCall.name)
  if (!tool) return { ok: false, error: `Unknown tool: ${input.toolCall.name}`, status: 400 }

  const dryRun = await executeMcpTool(tenant, input.toolCall, { dryRun: true, userId: input.requestedBy })
  if (!dryRun.ok) return { ok: false, error: dryRun.error, status: 403 }

  if (tool.requiresApproval) {
    const pending = await createPendingAgenticAction({
      toolCall: input.toolCall,
      dryRun,
      createdBy: input.requestedBy,
      idempotencyKey: `${tenant.tenantId}:${input.toolCall.name}:${JSON.stringify(input.toolCall.input)}`,
    })
    if (!pending.ok) {
      if (pending.setupRequired) {
        return { ok: false, error: pending.error, status: 503, setupRequired: true }
      }
      return { ok: false, error: pending.error, status: 500 }
    }
    return { ok: true, action: pending.action, dryRun }
  }

  const result = await executeMcpTool(tenant, input.toolCall, { userId: input.requestedBy })
  return result.ok ? { ok: true, result } : { ok: false, error: result.error, status: 500 }
}

export async function getAgenticTools() {
  const tenant = await getAgenticTenantContext()
  return listMcpToolsForTenant(tenant)
}

export { evaluateAgenticEntitlement }
