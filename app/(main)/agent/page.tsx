"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { InboxCard } from '@/components/agent/inbox-card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useUser } from '@/contexts/user-context'

type AgentInboxItem = {
  id: string
  name?: string
  toolName: string
  status: string
  createdAt?: string
  payload: Record<string, unknown>
}

function InboxSkeleton() {
  return (
    <div className="space-y-3 pb-6">
      {[1, 2].map((key) => (
        <div
          key={key}
          className="animate-pulse rounded-xl border border-border bg-card p-5"
        >
          <div className="h-4 w-2/3 max-w-sm rounded bg-muted" />
          <div className="mt-3 h-3 w-full rounded bg-muted/70" />
          <div className="mt-2 h-3 w-4/5 rounded bg-muted/70" />
          <div className="mt-6 flex gap-2">
            <div className="h-9 w-24 rounded-md bg-muted" />
            <div className="h-9 w-24 rounded-md bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AgentInboxPage() {
  const { canAccess, loading: rolesLoading } = useUser()
  const [items, setItems] = useState<AgentInboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lockedReason, setLockedReason] = useState<string | null>(null)
  const [setupNotice, setSetupNotice] = useState<string | null>(null)

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
          setSetupNotice(null)
          return
        }
        throw new Error(data.error || 'Failed to load inbox')
      }

      setLockedReason(null)
      setItems(data.items || [])
      if (data.setupRequired && data.notice) {
        setSetupNotice(data.notice)
      } else {
        setSetupNotice(null)
      }
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
        if (data.setupRequired && data.error) {
          setSetupNotice(data.error)
          await loadInbox()
          return
        }
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
        if (data.setupRequired && data.error) {
          setSetupNotice(data.error)
          return
        }
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
        <Button
          type="button"
          onClick={triggerScan}
          variant="secondary"
          className="shrink-0"
        >
          Run safe scan
        </Button>
      </PageHeader>

      <main className="app-content mx-auto w-full max-w-5xl space-y-6 pb-10">
        {!rolesLoading && !canAccess('agent-inbox') && (
          <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Access denied. Agent Inbox is limited to sales and admin roles.
          </section>
        )}

        {rolesLoading || !canAccess('agent-inbox') ? null : (
          <>
            <section className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30 p-6 shadow-sm md:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Approvals
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Agent inbox
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Tool calls that change data wait here until a teammate approves or rejects them. Nothing runs in ERPNext until you approve.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <Link href="/agents" className="font-medium text-primary underline-offset-4 hover:underline">
                  Open Agentic AI chat
                </Link>
              </div>
            </section>

            {setupNotice && (
              <Alert className="border-amber-500/40 bg-amber-500/5 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                <AlertTitle>ERPNext setup required</AlertTitle>
                <AlertDescription className="mt-1 space-y-2">
                  <p>{setupNotice}</p>
                  <p className="font-mono text-[11px] opacity-90">
                    Repo path: frappe-config/agent_action_log.json
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {lockedReason ? (
              <section className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                {lockedReason}
              </section>
            ) : loading ? (
              <InboxSkeleton />
            ) : items.length === 0 ? (
              <section className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
                <p className="text-sm font-medium text-foreground">No pending actions</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  {setupNotice
                    ? 'After you install Agent Action Log and migrate, pending tool runs will show up here.'
                    : 'When the agent proposes a change, it appears here for review. Use “Run safe scan” to enqueue a sample task if your site is configured.'}
                </p>
              </section>
            ) : (
              <section className="space-y-4">
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
