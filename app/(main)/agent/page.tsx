"use client"

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { InboxCard } from '@/components/agent/inbox-card'
import { Button } from '@/components/ui/button'
import { useUser } from '@/contexts/user-context'

type AgentInboxItem = {
  id: string
  name?: string
  toolName: string
  status: string
  createdAt?: string
  payload: Record<string, unknown>
}

export default function AgentInboxPage() {
  const { canAccess, loading: rolesLoading } = useUser()
  const [items, setItems] = useState<AgentInboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lockedReason, setLockedReason] = useState<string | null>(null)

  async function loadInbox() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/agentic/inbox', { cache: 'no-store' })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 403) {
          setLockedReason(data.error || 'Agentic AI is not enabled for this tenant.')
          setItems([])
          return
        }
        throw new Error(data.error || 'Failed to load inbox')
      }

      setLockedReason(null)
      setItems(data.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inbox')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInbox()
  }, [])

  async function handleDecision(id: string, approved: boolean) {
    setActionLoadingId(id)
    setError(null)

    try {
      const res = await fetch(`/api/agentic/actions/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process action')
      }
      await loadInbox()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process action')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function triggerScan() {
    setError(null)

    try {
      const res = await fetch('/api/agentic/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolCall: {
            name: 'tasks.create_follow_up_task',
            input: {
              subject: 'Review Agentic AI safe scan recommendation',
              date: new Date().toISOString().slice(0, 10),
            },
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to enqueue scan')
      }
      await loadInbox()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enqueue scan')
    }
  }

  return (
    <div className="app-shell">
      <PageHeader>
        <Button onClick={triggerScan} className="bg-background text-white hover:bg-slate-800">
          Run Safe Scan
        </Button>
      </PageHeader>

      <main className="app-content mx-auto w-full max-w-5xl space-y-4">
        {!rolesLoading && !canAccess('agent-inbox') && (
          <section className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Access denied. Agent Inbox is limited to sales and admin roles.
          </section>
        )}

        {rolesLoading || !canAccess('agent-inbox') ? null : (
          <>
        <section className="rounded-xl border border-border bg-card p-5 shadow-none">
          <h1 className="text-xl font-semibold text-foreground">Agent Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suggestions stay pending until someone approves or rejects them.
          </p>
        </section>

        {error && (
          <section className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </section>
        )}

        {lockedReason ? (
          <section className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            {lockedReason}
          </section>
        ) : loading ? (
          <section className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading agent inbox...
          </section>
        ) : items.length === 0 ? (
          <section className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            No pending actions. Trigger a sample run to generate one safe approval item.
          </section>
        ) : (
          <section className="space-y-3 pb-6">
            {items.map((item) => (
              <InboxCard
                key={item.id || item.name}
                item={item}
                loading={actionLoadingId === (item.id || item.name)}
                onApprove={() => handleDecision(item.id || item.name || '', true)}
                onReject={() => handleDecision(item.id || item.name || '', false)}
              />
            ))}
          </section>
        )}
          </>
        )}
      </main>
    </div>
  )
}
