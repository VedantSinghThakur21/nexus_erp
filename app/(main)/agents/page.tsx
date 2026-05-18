import { AgentWorkspaceClient } from '@/components/agents/agent-workspace-client'
import {
  evaluateAgenticEntitlement,
  getAgenticTenantContext,
} from '@/plugins/agentic-ai/entitlements'
import { getAgenticTools } from '@/plugins/agentic-ai/orchestrator'

export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  const tenant = await getAgenticTenantContext()
  const entitlement = evaluateAgenticEntitlement(tenant)
  const tools = entitlement.allowed ? await getAgenticTools() : []

  return (
    <AgentWorkspaceClient
      initialEntitlement={{
        allowed: entitlement.allowed,
        reason: entitlement.reason,
        plan: entitlement.plan,
        flags: entitlement.flags,
        siteName: tenant.siteName,
        tools,
      }}
    />
  )
}
