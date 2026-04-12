import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type AgentInboxItem = {
  name: string
  action_type: string
  tenant: string
  triggered_by: string
  creation: string
  payload: string
}

function parsePayload(payload: string): { title: string; reason: string; confidence: number } {
  try {
    const parsed = JSON.parse(payload) as { title?: string; reason?: string; confidence?: number }
    return {
      title: parsed.title || 'Agent suggestion',
      reason: parsed.reason || 'No reason provided',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    }
  } catch {
    return {
      title: 'Agent suggestion',
      reason: payload,
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

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-base text-slate-900">{parsed.title}</CardTitle>
        <CardDescription className="text-slate-600">{parsed.reason}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 text-xs text-slate-500 md:grid-cols-2">
          <p><span className="font-semibold text-slate-700">Action:</span> {item.action_type}</p>
          <p><span className="font-semibold text-slate-700">Tenant:</span> {item.tenant}</p>
          <p><span className="font-semibold text-slate-700">Triggered by:</span> {item.triggered_by}</p>
          <p><span className="font-semibold text-slate-700">Created:</span> {new Date(item.creation).toLocaleString()}</p>
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
