'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Inbox } from 'lucide-react'
import { InboxCard } from '@/components/agent/inbox-card'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'

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

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((k) => (
          <div key={k} className="h-28 animate-pulse rounded-2xl bg-muted/40 ring-1 ring-border/40" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground ring-1 ring-border/50">
          <Inbox className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">No pending approvals</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When the agent proposes a write, it appears here for review.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/agent">Open full inbox</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {items.map((item) => (
        <InboxCard
          key={item.id || item.name}
          item={item}
          loading={actionId === (item.id || item.name)}
          onApprove={() => decide(item.id || item.name || '', true)}
          onReject={() => decide(item.id || item.name || '', false)}
          compact
        />
      ))}
    </div>
  )
}
