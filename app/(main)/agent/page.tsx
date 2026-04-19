"use client"

import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { InboxCard } from '@/components/agent/inbox-card'
import { Button } from '@/components/ui/button'
import { useUser } from '@/contexts/user-context'

type AgentInboxItem = {
  name: string
  action_type: string
  tenant: string
  triggered_by: string
  approved_by?: string
  creation: string
  modified: string
  payload: string
  result?: string
}

export default function AgentInboxPage() {
  const { canAccess, loading: rolesLoading } = useUser()
  const [items, setItems] = useState<AgentInboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadInbox() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/agent/inbox', { cache: 'no-store' })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load inbox')
      }

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
      const res = await fetch(`/api/agent/action/${encodeURIComponent(id)}`, {
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
      const res = await fetch('/api/agent/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant: 'master' }),
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

        {loading ? (
          <section className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Loading agent inbox...
          </section>
        ) : items.length === 0 ? (
          <section className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            No pending actions. Trigger a scan to generate one safe suggestion.
          </section>
        ) : (
          <section className="space-y-3 pb-6">
            {items.map((item) => (
              <InboxCard
                key={item.name}
                item={item}
                loading={actionLoadingId === item.name}
                onApprove={() => handleDecision(item.name, true)}
                onReject={() => handleDecision(item.name, false)}
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
