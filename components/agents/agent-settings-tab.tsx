'use client'

import { useEffect, useState } from 'react'
import type { AgentsInitialEntitlement } from './agents-chat-client'

export function AgentSettingsTab({ entitlement }: { entitlement: AgentsInitialEntitlement }) {
  const flags = entitlement.flags || {}
  const [openRouterConfigured, setOpenRouterConfigured] = useState<boolean | null>(null)
  const [openRouterKeySource, setOpenRouterKeySource] = useState<string | null>(null)

  useEffect(() => {
    void fetch('/api/agentic/entitlement')
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.openRouterConfigured === 'boolean') {
          setOpenRouterConfigured(data.openRouterConfigured)
        }
        if (typeof data.openRouterKeySource === 'string') {
          setOpenRouterKeySource(data.openRouterKeySource)
        }
      })
      .catch(() => undefined)
  }, [])

  const rows = [
    { label: 'Plan', value: entitlement.plan ?? '—' },
    { label: 'Frappe site', value: entitlement.siteName ?? '—' },
    { label: 'agentic_ai_enabled', value: flags.agentic_ai_enabled ? 'Yes' : 'No' },
    { label: 'agentic_finance_enabled', value: flags.agentic_finance_enabled ? 'Yes' : 'No' },
    {
      label: 'OpenRouter API key',
      value:
        openRouterConfigured === null
          ? 'Checking…'
          : openRouterConfigured
            ? `Configured (${openRouterKeySource ?? 'env'})`
            : 'Missing in server env',
    },
  ]

  const showKeyHelp = openRouterConfigured === false

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

      {showKeyHelp && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-foreground">
          <p className="font-medium">OpenRouter key not loaded by the server</p>
          <p className="mt-1 text-muted-foreground">
            Add <code className="rounded bg-muted px-1">OPENROUTER_API_KEY=sk-or-v1-...</code> to{' '}
            <code className="rounded bg-muted px-1">Downloads/nexus_erp/.env.local</code> (not your home folder).
            Keys starting with <code className="rounded bg-muted px-1">sk-proj-</code> are OpenAI, not OpenRouter.
            Then run <code className="rounded bg-muted px-1">npm run agentic:check-env</code> and restart the app.
          </p>
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Server env: <code className="rounded-md bg-muted px-1.5 py-0.5">OPENROUTER_API_KEY</code>,{' '}
        <code className="rounded-md bg-muted px-1.5 py-0.5">OPENROUTER_MODEL</code> (optional),{' '}
        <code className="rounded-md bg-muted px-1.5 py-0.5">REDIS_URL=disabled</code> (optional).
      </p>
    </div>
  )
}
