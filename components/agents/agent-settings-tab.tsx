'use client'

import type { AgentsInitialEntitlement } from './agents-chat-client'

export function AgentSettingsTab({ entitlement }: { entitlement: AgentsInitialEntitlement }) {
  const flags = entitlement.flags || {}
  return (
    <div className="max-w-lg space-y-4 rounded-xl border border-border bg-card p-6">
      <h3 className="font-semibold text-foreground">Agent settings</h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Plan</dt>
          <dd className="font-medium">{entitlement.plan}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Site</dt>
          <dd className="font-medium">{entitlement.siteName}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">agentic_ai_enabled</dt>
          <dd>{flags.agentic_ai_enabled ? 'Yes' : 'No'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">agentic_finance_enabled</dt>
          <dd>{flags.agentic_finance_enabled ? 'Yes' : 'No'}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        Model and context limits follow your plan via OPENROUTER_MODEL on the server.
      </p>
    </div>
  )
}
