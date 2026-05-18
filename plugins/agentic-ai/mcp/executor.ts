import type { AgenticTenantContext } from '../types'
import { canUseAgenticTool } from '../entitlements'
import { getMcpTool } from './registry'
import { buildToolContext } from './tool-runtime'
import type { MCPToolCall, MCPToolResult } from './types'

export async function executeMcpTool(
  context: AgenticTenantContext,
  toolCall: MCPToolCall,
  options: { dryRun?: boolean; runId?: string; userId?: string } = {}
): Promise<MCPToolResult & { ok: boolean }> {
  const definition = getMcpTool(toolCall.name)
  if (!definition) {
    return { ok: false, success: false, error: `Unknown tool: ${toolCall.name}`, idempotencyKey: '' }
  }

  const entitlement = canUseAgenticTool(context, definition.requiredPlan, definition.requiredFlag)
  if (!entitlement.allowed) {
    return {
      ok: false,
      success: false,
      error: entitlement.reason || 'Tool is not enabled for this tenant.',
      idempotencyKey: '',
    }
  }

  const toolContext = buildToolContext(
    context.tenantId,
    options.userId || 'system',
    options.runId || `run-${Date.now()}`
  )

  try {
    if (options.dryRun && definition.dryRun) {
      const preview = await definition.dryRun(toolCall.input, toolContext)
      return {
        ok: true,
        success: true,
        dryRun: true,
        data: preview,
        idempotencyKey: '',
      }
    }

    const result = await definition.execute(toolCall.input, toolContext)
    return { ...result, ok: result.success }
  } catch (error) {
    return {
      ok: false,
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed',
      idempotencyKey: '',
    }
  }
}
