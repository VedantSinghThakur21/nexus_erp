import type { AgenticEntitlement, AgenticTenantContext } from '../types'
import { canUseAgenticTool } from '../entitlements'
import type { MCPTool, MCPToolName, ToolClassification } from './types'
import { crmTools } from './tools/crm'
import { quotesTools } from './tools/quotes'
import { inventoryTools } from './tools/inventory'
import { pricingTools } from './tools/pricing'
import { invoicesTools } from './tools/invoices'
import { paymentsTools } from './tools/payments'
import { tasksTools } from './tools/tasks'

export class MCPRegistry {
  private tools = new Map<string, MCPTool>()

  register(tool: MCPTool): void {
    this.tools.set(tool.name, tool)
  }

  get(name: string): MCPTool | undefined {
    return this.tools.get(name)
  }

  listEntitled(entitlement: AgenticEntitlement & { allowed: true }): MCPTool[] {
    const context: Pick<AgenticTenantContext, 'plan' | 'flags'> = {
      plan: entitlement.plan,
      flags: entitlement.flags,
    }
    return Array.from(this.tools.values()).filter((tool) => {
      const gate = canUseAgenticTool(context, tool.requiredPlan, tool.requiredFlag)
      if (!gate.allowed) return false
      if (tool.classification === 'destructive' && !context.flags.agentic_destructive_tools_enabled) {
        return false
      }
      return true
    })
  }

  getByClassification(c: ToolClassification): MCPTool[] {
    return Array.from(this.tools.values()).filter((t) => t.classification === c)
  }

  all(): MCPTool[] {
    return Array.from(this.tools.values())
  }
}

export const registry = new MCPRegistry()

;[...crmTools, ...quotesTools, ...inventoryTools, ...pricingTools, ...invoicesTools, ...paymentsTools, ...tasksTools].forEach(
  (t) => registry.register(t)
)

export function getMcpTool(name: MCPToolName): MCPTool | undefined {
  return registry.get(name) as MCPTool | undefined
}

export function listMcpToolsForTenant(context: AgenticTenantContext) {
  return registry.all().map((tool) => {
    const entitlement = canUseAgenticTool(context, tool.requiredPlan, tool.requiredFlag)
    const destructiveBlocked =
      tool.classification === 'destructive' && !context.flags.agentic_destructive_tools_enabled

    return {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      requiredPlan: tool.requiredPlan,
      requiredFlag: tool.requiredFlag,
      requiresApproval: tool.requiresApproval,
      classification: tool.classification,
      dryRunSupported: tool.supportsDryRun,
      enabled: entitlement.allowed && !destructiveBlocked,
      disabledReason: destructiveBlocked
        ? 'Requires agentic_destructive_tools_enabled.'
        : entitlement.reason,
    }
  })
}

/** @deprecated use registry.all() */
export const AGENTIC_MCP_TOOLS = registry.all()
