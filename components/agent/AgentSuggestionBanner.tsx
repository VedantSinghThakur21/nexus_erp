"use client"

import { Sparkles, X, ArrowRight } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  suggestion: {
    id: string
    text: string
    action_label: string
    action_type: string
  }
  onApprove: (id: string) => Promise<void> | void
  onDismiss: (id: string) => void
}

export function AgentSuggestionBanner({ suggestion, onApprove, onDismiss }: Props) {
  const [loading, setLoading] = useState(false)

  return (
    <div className="ai-ring rounded-xl bg-[hsl(var(--ai-surface))] border border-[hsl(var(--ai-border))] px-4 py-3 flex items-center gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
      </div>
      <p className="flex-1 text-sm text-foreground">{suggestion.text}</p>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="outline" className="h-7 text-xs border-border/60" onClick={() => onDismiss(suggestion.id)}>
          Dismiss
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs gap-1"
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            await onApprove(suggestion.id)
            setLoading(false)
          }}
        >
          {suggestion.action_label}
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
      <button
        onClick={() => onDismiss(suggestion.id)}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
