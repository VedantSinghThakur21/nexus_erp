'use client'

import type { AgentsInitialEntitlement } from './agents-chat-client'

export function AgentSettingsTab({ entitlement }: { entitlement: AgentsInitialEntitlement }) {
  const flags = entitlement.flags || {}

  const rows = [
    { label: 'Plan', value: entitlement.plan ?? '—' },
    { label: 'Frappe site', value: entitlement.siteName ?? '—' },
    { label: 'agentic_ai_enabled', value: flags.agentic_ai_enabled ? 'Yes' : 'No' },
    { label: 'agentic_finance_enabled', value: flags.agentic_finance_enabled ? 'Yes' : 'No' },
  ]

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">Agent settings</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Model and limits are configured on the server via environment variables.
        </p>
      </div>

      <dl className="divide-y divide-border/60 overflow-hidden rounded-2xl bg-muted/25 ring-1 ring-border/50">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 px-4 py-3 text-sm">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-medium capitalize text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Server env: <code className="rounded-md bg-muted px-1.5 py-0.5">OPENROUTER_API_KEY</code>,{' '}
        <code className="rounded-md bg-muted px-1.5 py-0.5">OPENROUTER_MODEL</code>,{' '}
        <code className="rounded-md bg-muted px-1.5 py-0.5">REDIS_URL</code> (optional — use{' '}
        <code className="rounded-md bg-muted px-1.5 py-0.5">disabled</code> if Redis is not on the app host).
      </p>
    </div>
  )
}
