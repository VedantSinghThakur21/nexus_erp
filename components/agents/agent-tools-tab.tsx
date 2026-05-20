'use client'

import { useEffect, useState } from 'react'
import { Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type ToolRow = {
  name: string
  enabled?: boolean
  disabledReason?: string
  requiredPlan?: string
  requiredFlag?: string
}

export function AgentToolsTab() {
  const [enabled, setEnabled] = useState<ToolRow[]>([])
  const [locked, setLocked] = useState<ToolRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch('/api/agentic/entitlement')
      .then((r) => r.json())
      .then((data) => {
        const enabledNames = (data.enabledTools as string[] | undefined) || []
        const lockedTools = (data.lockedTools as ToolRow[] | undefined) || []
        setEnabled(enabledNames.map((name) => ({ name, enabled: true })))
        setLocked(lockedTools.map((t) => ({ ...t, name: t.name, enabled: false })))
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Wrench className="h-4 w-4 animate-pulse" />
        Loading tools…
      </div>
    )
  }

  const all = [...enabled, ...locked]

  return (
    <div className="mx-auto max-w-4xl">
      <p className="mb-5 text-sm text-muted-foreground">
        Tools available to the model for your plan and feature flags.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {all.map((tool) => (
          <div
            key={tool.name}
            className="rounded-2xl bg-muted/20 p-4 ring-1 ring-border/50 transition hover:bg-muted/35 hover:ring-border"
            title={tool.disabledReason || tool.requiredFlag}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{tool.name}</p>
              <Badge variant={tool.enabled ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
                {tool.enabled ? 'On' : 'Locked'}
              </Badge>
            </div>
            {!tool.enabled && (
              <p className="mt-2 text-xs text-muted-foreground">
                {tool.requiredPlan ? `Requires ${tool.requiredPlan}` : tool.disabledReason}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
