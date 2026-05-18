'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'

type ToolRow = {
  name: string
  enabled?: boolean
  disabledReason?: string
  requiredPlan?: string
  requiredFlag?: string
}

export function AgentToolsTab() {
  const [tools, setTools] = useState<ToolRow[]>([])
  const [locked, setLocked] = useState<ToolRow[]>([])

  useEffect(() => {
    void fetch('/api/agentic/entitlement')
      .then((r) => r.json())
      .then((data) => {
        const enabled = (data.enabledTools as string[] | undefined) || []
        const lockedTools = (data.lockedTools as ToolRow[] | undefined) || []
        setTools(
          enabled.map((name) => ({ name, enabled: true }))
        )
        setLocked(lockedTools.map((t) => ({ ...t, name: t.name, enabled: false })))
      })
  }, [])

  const all = [...tools, ...locked]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {all.map((tool) => (
        <div
          key={tool.name}
          className="rounded-lg border border-border bg-card p-4"
          title={tool.disabledReason || tool.requiredFlag}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{tool.name}</p>
            <Badge variant={tool.enabled ? 'default' : 'secondary'}>
              {tool.enabled ? 'Enabled' : 'Locked'}
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
  )
}
