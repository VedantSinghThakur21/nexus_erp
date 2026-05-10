import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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

function parsePayload(payload: string | Record<string, unknown>): { title: string; reason: string; confidence: number } {
  try {
    const parsed = typeof payload === 'string'
      ? JSON.parse(payload) as { title?: string; reason?: string; confidence?: number }
      : payload as { title?: string; reason?: string; confidence?: number }
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
}: {
  item: AgentInboxItem
  loading: boolean
  onApprove: () => void
  onReject: () => void
}) {
  const parsed = parsePayload(item.payload)
  const actionType = item.action_type || item.toolName || 'Agent action'
  const createdAt = item.creation || item.createdAt || new Date().toISOString()

  return (
    <Card className="border-slate-200 bg-background shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-base text-slate-900">{parsed.title}</CardTitle>
        <CardDescription className="text-slate-600">{parsed.reason}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground md:grid-cols-2">
          <p><span className="font-semibold text-slate-700">Action:</span> {actionType}</p>
          <p><span className="font-semibold text-slate-700">Tenant:</span> {item.tenant || 'current tenant'}</p>
          <p><span className="font-semibold text-slate-700">Triggered by:</span> {item.triggered_by || 'Agentic AI'}</p>
          <p><span className="font-semibold text-slate-700">Created:</span> {new Date(createdAt).toLocaleString()}</p>
          <p><span className="font-semibold text-slate-700">Confidence:</span> {confidenceLabel(parsed.confidence)}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button disabled={loading} onClick={onApprove} className="bg-emerald-600 hover:bg-emerald-700">
            Approve
          </Button>
          <Button disabled={loading} onClick={onReject} variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50">
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
