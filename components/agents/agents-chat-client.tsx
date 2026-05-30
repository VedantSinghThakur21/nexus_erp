'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bot, Loader2, Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MarkdownBodyLazy } from '@/components/agents/markdown-body-lazy'
import { AnalyticsResponseRenderer } from '@/components/ai/structured-chat-response'
import type { AnalyticsResponse } from '@/lib/analyticsApi'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Array<{ title: string; citation?: string }>
  displays?: AnalyticsResponse[]
}

export type AgentsInitialEntitlement = {
  allowed: boolean
  reason?: string
  plan?: string
  flags?: Record<string, boolean>
  siteName?: string
  tools?: unknown[]
}

const SUGGESTIONS = [
  'Show open leads from this week',
  'Check availability for a 50T crane',
  'Summarize overdue invoices',
]

export function AgentsChatClient({
  initialEntitlement,
  embedded = false,
}: {
  initialEntitlement: AgentsInitialEntitlement
  embedded?: boolean
}) {
  const entitlement = initialEntitlement
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi — I'm Nexus. I can look up leads, stock, quotes, and invoices from your live CRM, and help you draft changes that your team approves before they go live. What would you like to know?",
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function handleSend(text?: string) {
    const userMessageContent = (text ?? input).trim()
    if (!userMessageContent || isLoading) return

    if (!entitlement?.allowed) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          role: 'assistant',
          content: entitlement?.reason || 'Agentic AI is not enabled for this tenant.',
        },
      ])
      return
    }

    const userMessage: Message = {
      id: String(Date.now()),
      role: 'user',
      content: userMessageContent,
    }

    setInput('')
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/agentic/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessageContent, mode: 'chat' }),
      })

      const data = (await response.json().catch(() => ({}))) as {
        error?: string
        code?: string
        result?: {
          answer?: string
          citations?: Array<{ title: string; citation?: string }>
          displays?: AnalyticsResponse[]
        }
      }

      if (!response.ok) {
        const detail = data.error || `Request failed (${response.status})`
        if (response.status === 403) {
          throw new Error(detail || 'Agentic AI is not enabled for this tenant.')
        }
        if (response.status === 429) {
          throw new Error('Too many requests — wait a minute and try again.')
        }
        throw new Error(detail)
      }

      const citations = (data.result?.citations ?? []) as Array<{ title: string; citation?: string }>
      const displays = data.result?.displays
      const answer = data.result?.answer || (displays?.length ? '' : 'No response generated.')

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: answer,
          displays: displays?.length ? displays : undefined,
          citations: citations.length > 0 ? citations : undefined,
        },
      ])
    } catch (err) {
      const apiMessage = err instanceof Error ? err.message : ''
      const hint =
        apiMessage.includes('OPENROUTER') || apiMessage.includes('Model unavailable')
          ? ' Add `OPENROUTER_API_KEY` to **nexus_erp/.env.local** (project root), then restart `npm run dev` or PM2.'
          : ''
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          role: 'assistant',
          content:
            apiMessage ||
            `I could not reach the model right now.${hint || ' Check the server logs or try again in a moment.'}`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  if (!embedded && !entitlement.allowed) {
    return null
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', embedded ? 'h-full' : '')}>
      {embedded && (
        <p className="shrink-0 border-b border-border/40 bg-muted/20 px-4 py-2 text-center text-[11px] text-muted-foreground md:px-6">
          Live CRM data · changes go through{' '}
          <Link href="/agent" className="font-medium text-primary hover:underline">
            team approval
          </Link>
          first
        </p>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
              {messages.map((m) =>
                m.role === 'user' ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-border/60">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="space-y-3">
                        {m.content.trim() && (
                          <div className="rounded-2xl rounded-tl-md bg-muted/50 px-4 py-3 ring-1 ring-border/40">
                            <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                              <MarkdownBodyLazy content={m.content} />
                            </div>
                          </div>
                        )}
                        {m.displays?.map((display, i) => (
                          <AnalyticsResponseRenderer key={`${m.id}-d-${i}`} response={display} />
                        ))}
                        {!m.content.trim() && !m.displays?.length && (
                          <div className="rounded-2xl rounded-tl-md bg-muted/50 px-4 py-3 ring-1 ring-border/40 text-sm text-muted-foreground">
                            No response generated.
                          </div>
                        )}
                      </div>
                      {m.citations && m.citations.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {m.citations.map((c, i) => (
                            <span
                              key={`${m.id}-c-${i}`}
                              className="inline-flex max-w-full truncate rounded-full bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground ring-1 ring-border"
                              title={c.citation ?? c.title}
                            >
                              {c.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                  <div className="rounded-2xl rounded-tl-md bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                    Thinking…
                  </div>
                </div>
              )}

              {messages.length === 1 && !isLoading && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void handleSend(s)}
                      className="rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border transition hover:bg-muted/60"
                    >
                      <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <footer className="shrink-0 border-t border-border/60 bg-background/95 px-4 py-4 backdrop-blur-sm md:px-6">
            <form
              className="mx-auto flex w-full max-w-3xl gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void handleSend()
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about leads, stock, quotes, invoices…"
                disabled={isLoading}
                className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
              Read-only in chat mode · Writes go to{' '}
              <Link href="/agent" className="font-medium text-primary hover:underline">
                Agent inbox
              </Link>
            </p>
          </footer>
        </div>

        <aside className="hidden w-64 shrink-0 border-l border-border/60 bg-muted/20 p-5 lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">How it works</p>
          <ul className="mt-4 space-y-4 text-xs leading-relaxed text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Live ERP data</span> — answers use your Frappe site, not a static copy.
            </li>
            <li>
              <span className="font-medium text-foreground">Approvals</span> — side-effecting tools create pending actions in{' '}
              <Link href="/agent" className="text-primary hover:underline">
                Inbox
              </Link>
              .
            </li>
            <li>
              <span className="font-medium text-foreground">Citations</span> — sources appear under replies when RAG finds relevant context.
            </li>
          </ul>
        </aside>
      </div>
    </div>
  )
}
