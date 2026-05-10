import { getModelPolicy } from './config'
import { getAgenticEntitlement, getAgenticTenantContext } from './entitlements'
import { completeWithOpenRouter, OpenRouterError } from './model/openrouter'
import { executeMcpTool } from './mcp/executor'
import { getMcpTool, listMcpToolsForTenant } from './mcp/registry'
import type { MCPToolCall } from './mcp/types'
import { retrieveAgenticContext } from './rag/retriever'
import { createPendingAgenticAction } from './audit'
import type { AgenticChatResult, AgenticMode } from './types'

function buildSystemPrompt(contextBlock: string, mode: AgenticMode): string {
  return [
    'You are Nexus Agentic AI, an ERP assistant for CRM, rentals, inventory, quotations, invoices, and follow-up work.',
    'Use retrieved context when it is relevant. Cite context titles naturally when making specific claims.',
    'Never claim that an action has been executed unless a tool result says it has.',
    'For write actions, propose the action and require approval before execution.',
    `Current workflow mode: ${mode}.`,
    contextBlock ? `Retrieved context:\n${contextBlock}` : 'No relevant retrieved context was found.',
  ].join('\n\n')
}

function formatContextBlock(context: Awaited<ReturnType<typeof retrieveAgenticContext>>): string {
  return context
    .map((item, index) => `[${index + 1}] ${item.title}${item.citation ? ` (${item.citation})` : ''}\n${item.content}`)
    .join('\n\n')
}

function offlineAgenticAnswer(message: string, contextCount: number): string {
  return [
    'Agentic AI is configured, but live model access is not available yet.',
    '',
    `I can still route this request through the plugin workflow. Your request was: "${message}".`,
    contextCount > 0
      ? `I found ${contextCount} relevant context item(s). Configure OPENROUTER_API_KEY to generate a grounded response.`
      : 'No relevant RAG context was found. Configure OPENROUTER_API_KEY and tenant knowledge sources for richer answers.',
  ].join('\n')
}

export async function runAgenticChat(input: {
  message: string
  mode?: AgenticMode
}): Promise<{ ok: boolean; result?: AgenticChatResult; entitlement?: unknown; error?: string; status?: number }> {
  const entitlement = await getAgenticEntitlement()
  if (!entitlement.allowed) {
    return { ok: false, entitlement, error: entitlement.reason, status: 403 }
  }

  const tenant = await getAgenticTenantContext()
  const retrievedContext = await retrieveAgenticContext(input.message, tenant.tenantId)
  const contextBlock = formatContextBlock(retrievedContext)
  const policy = getModelPolicy(tenant.plan)

  try {
    const completion = await completeWithOpenRouter(tenant.plan, [
      { role: 'system', content: buildSystemPrompt(contextBlock, input.mode || 'chat') },
      { role: 'user', content: input.message },
    ], policy)

    return {
      ok: true,
      result: {
        answer: completion.text,
        citations: retrievedContext.map((item) => ({ title: item.title, citation: item.citation })),
        metadata: {
          model: completion.model,
          fallbackUsed: completion.fallbackUsed,
          latencyMs: completion.latencyMs,
          contextCount: retrievedContext.length,
        },
      },
    }
  } catch (error) {
    if (error instanceof OpenRouterError && error.code === 'missing_api_key') {
      return {
        ok: true,
        result: {
          answer: offlineAgenticAnswer(input.message, retrievedContext.length),
          citations: retrievedContext.map((item) => ({ title: item.title, citation: item.citation })),
          metadata: {
            model: 'offline',
            fallbackUsed: false,
            contextCount: retrievedContext.length,
          },
        },
      }
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Agentic model request failed',
      status: 502,
    }
  }
}

export async function createAgenticRun(input: {
  toolCall: MCPToolCall
  requestedBy?: string
}): Promise<{ ok: boolean; action?: unknown; dryRun?: unknown; result?: unknown; error?: string; status?: number }> {
  const entitlement = await getAgenticEntitlement()
  if (!entitlement.allowed) {
    return { ok: false, error: entitlement.reason, status: 403 }
  }

  const tenant = await getAgenticTenantContext()
  const tool = getMcpTool(input.toolCall.name)
  if (!tool) return { ok: false, error: `Unknown tool: ${input.toolCall.name}`, status: 400 }

  const dryRun = await executeMcpTool(tenant, input.toolCall, { dryRun: true })
  if (!dryRun.ok) return { ok: false, error: dryRun.error, status: 403 }

  if (tool.requiresApproval) {
    const pending = await createPendingAgenticAction({
      toolCall: input.toolCall,
      dryRun,
      createdBy: input.requestedBy,
      idempotencyKey: `${tenant.tenantId}:${input.toolCall.name}:${JSON.stringify(input.toolCall.input)}`,
    })
    if (!pending.ok) return { ok: false, error: pending.error, status: 500 }
    return { ok: true, action: pending.action, dryRun }
  }

  const result = await executeMcpTool(tenant, input.toolCall)
  return result.ok ? { ok: true, result } : { ok: false, error: result.error, status: 500 }
}

export async function getAgenticTools() {
  const tenant = await getAgenticTenantContext()
  return listMcpToolsForTenant(tenant)
}

