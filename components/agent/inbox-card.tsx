import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AgentInboxItem = {
  name?: string
  id?: string
  action_type?: string
  toolName?: string
  tenant?: string
  triggered_by?: string
  createdAt?: string
  creation?: string
  payload: string | Record<string, unknown>
}

function parsePayload(payload: string | Record<string, unknown>): {
  title: string
  reason: string
  confidence: number
} {
  try {
    const parsed =
      typeof payload === 'string'
        ? (JSON.parse(payload) as { title?: string; reason?: string; confidence?: number })
        : (payload as { title?: string; reason?: string; confidence?: number })
    return {
      title: parsed.title || 'Agent suggestion',
      reason: parsed.reason || JSON.stringify(payload, null, 2),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    }
  } catch {
    return {
      title: 'Agent suggestion',
      reason: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2),
      confidence: 0,
    }
  }
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High confidence'
  if (confidence >= 0.5) return 'Medium confidence'
  return 'Low confidence'
}

export function InboxCard({
  item,
  loading,
  onApprove,
  onReject,
  compact,
}: {
  item: AgentInboxItem
  loading: boolean
  onApprove: () => void
  onReject: () => void
  compact?: boolean
}) {
  const parsed = parsePayload(item.payload)
  const actionType = item.action_type || item.toolName || 'Agent action'
  const createdAt = item.creation || item.createdAt || new Date().toISOString()

  return (
    <article
      className={cn(
        'rounded-2xl bg-card/80 p-5 ring-1 ring-border/60 transition hover:ring-border',
        compact && 'p-4',
      )}
    >
      <header className="space-y-1.5">
        <h3 className="text-base font-semibold text-foreground">{parsed.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">{parsed.reason}</p>
      </header>

      <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs text-muted-foreground sm:grid-cols-2">
        <div>
          <dt className="inline font-medium text-foreground/80">Action: </dt>
          <dd className="inline">{actionType}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-foreground/80">Tenant: </dt>
          <dd className="inline">{item.tenant || 'current tenant'}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-foreground/80">By: </dt>
          <dd className="inline">{item.triggered_by || 'Agentic AI'}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-foreground/80">Created: </dt>
          <dd className="inline">{new Date(createdAt).toLocaleString()}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline font-medium text-foreground/80">Confidence: </dt>
          <dd className="inline">{confidenceLabel(parsed.confidence)}</dd>
        </div>
      </dl>

      <footer className="mt-5 flex flex-wrap gap-2">
        <Button disabled={loading} onClick={onApprove} size="sm">
          Approve
        </Button>
        <Button disabled={loading} onClick={onReject} variant="outline" size="sm">
          Reject
        </Button>
      </footer>
    </article>
  )
}
