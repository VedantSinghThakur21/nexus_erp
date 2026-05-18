'use client'

import { useEffect, useState } from 'react'
import { InboxCard } from '@/components/agent/inbox-card'
import { useToast } from '@/components/ui/toast'

type InboxItem = {
  id: string
  name?: string
  toolName: string
  status: string
  payload: Record<string, unknown>
}

export function AgentInboxTab() {
  const { addToast } = useToast()
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/agentic/inbox', { cache: 'no-store' })
    const data = await res.json()
    if (res.ok) setItems(data.items || [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function decide(id: string, approved: boolean) {
    setActionId(id)
    const prev = items
    setItems((list) => list.filter((i) => (i.id || i.name) !== id))
    const res = await fetch(`/api/agentic/actions/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved }),
    })
    const data = await res.json()
    if (!res.ok) {
      setItems(prev)
      if (res.status === 409) {
        addToast({ type: 'warning', title: 'Already actioned by another approver' })
      } else {
        addToast({ type: 'error', title: data.error || 'Action failed' })
      }
    }
    await load()
    setActionId(null)
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading inbox…</p>
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No pending approvals.</p>
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <InboxCard
          key={item.id || item.name}
          item={item}
          loading={actionId === (item.id || item.name)}
          onApprove={() => decide(item.id || item.name || '', true)}
          onReject={() => decide(item.id || item.name || '', false)}
        />
      ))}
    </div>
  )
}
