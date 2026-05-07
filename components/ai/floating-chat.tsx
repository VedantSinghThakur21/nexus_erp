'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import {
  Sparkles,
  Send,
  Bot,
  User,
  Download,
  AlertCircle,
  Info,
  Loader2,
  BarChart3,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useClientTenant } from '@/lib/tenant-client'
import {
  askAnalytics,
  type AnalyticsResponse,
  type ChatApiResponse,
} from '@/lib/analyticsApi'
import { jsonToCsv, downloadCsv } from '@/utils/exportCsv'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string               // text content (user query or info/error text)
  response?: AnalyticsResponse  // structured response (only on assistant messages)
  toolUsed?: string | null
  timestamp: Date
}

// ---------------------------------------------------------------------------
// Example query chips
// ---------------------------------------------------------------------------

const EXAMPLE_QUERIES = [
  'Show unpaid invoices',
  'Confirmed sales orders',
  'Search customers',
]

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FloatingAIChat() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const tenant = useClientTenant()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Mount guard — portal requires document to exist (client-side only)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  // Hide on specific pages
  if (pathname === '/agents' || pathname === '/bookings' || pathname.startsWith('/bookings/')) {
    return null
  }

  const handleSend = async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed || isLoading) return

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)

    try {
      const result: ChatApiResponse = await askAnalytics(trimmed, tenant)

      // Build assistant message from structured response
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: getTextFromResponse(result.response),
        response: result.response,
        toolUsed: result.tool_used,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (error) {
      const errMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: error instanceof Error
          ? error.message
          : 'Failed to connect to analytics service.',
        response: {
          type: 'error',
          message: error instanceof Error
            ? error.message
            : 'Failed to connect to analytics service.',
        },
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setMessages([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(inputValue)
    }
  }

  const isEmpty = messages.length === 0

  // Don't render until mounted — createPortal needs document.body
  if (!mounted) return null

  return createPortal(
    <>
      {/* Floating Button — gradient glow */}
      <div className="pointer-events-none fixed bottom-5 right-5 h-16 w-16 rounded-full bg-blue-500/20 blur-md animate-pulse z-40" />
      <Button
        onClick={() => setOpen(true)}
        aria-label="Open analytics chat"
        id="analytics-chat-trigger"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 hover:from-blue-700 hover:via-blue-600 hover:to-purple-700 border border-blue-300/30 ring-2 ring-blue-400/30 transition-all duration-300 hover:scale-110"
        size="icon"
      >
        <Sparkles className="h-6 w-6 text-white" />
        <span className="absolute -top-1 -right-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-slate-900 border border-amber-200">
          AI
        </span>
      </Button>

      {/* Chat Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col h-full"
        >
          {/* Header */}
          <SheetHeader className="p-5 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-lg font-semibold">
                    Analytics Assistant
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    Ask questions about your ERP data
                  </p>
                </div>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleClear}
                  aria-label="Clear conversation"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Empty state — example chips */}
              {isEmpty && !isLoading && (
                <EmptyState onQueryClick={handleSend} />
              )}

              {/* Message thread */}
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/60 dark:bg-secondary/40 rounded-2xl px-4 py-2.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Analyzing your data…</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t p-4 bg-card/80 dark:bg-card/60 backdrop-blur-sm shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask about invoices, orders, customers…"
                  className="flex-1 px-4 py-2.5 border rounded-xl text-sm bg-transparent bg-background border-border/60 focus:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 transition-colors"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  id="analytics-chat-input"
                />
                <Button
                  className="px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
                  onClick={() => handleSend(inputValue)}
                  aria-label="Send message"
                  disabled={isLoading || !inputValue.trim()}
                  id="analytics-chat-send"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
                Press Enter to send · Data from your ERP
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>,
    document.body
  )
}


// ---------------------------------------------------------------------------
// Empty State — example query chips
// ---------------------------------------------------------------------------

function EmptyState({ onQueryClick }: { onQueryClick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-6 text-center px-4">
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-blue-600/10 flex items-center justify-center">
        <BarChart3 className="h-8 w-8 text-blue-500" />
      </div>
      <div>
        <h3 className="text-base font-semibold mb-1">Analytics Assistant</h3>
        <p className="text-sm text-muted-foreground max-w-[280px]">
          Ask questions in plain English and get instant insights from your ERP data.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLE_QUERIES.map(q => (
          <button
            key={q}
            onClick={() => onQueryClick(q)}
            className="px-3 py-1.5 text-xs font-medium rounded-full border border-border/60 bg-secondary/50 hover:bg-secondary hover:border-primary/30 text-foreground/80 hover:text-foreground transition-all duration-200 cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Message Bubble — renders based on response type
// ---------------------------------------------------------------------------

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex gap-3 justify-end">
        <div className="rounded-2xl px-4 py-2 max-w-[85%] text-sm bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-sm">
          {message.content}
        </div>
        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Assistant message — render based on response type
  return (
    <div className="flex gap-3 justify-start">
      <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="h-4 w-4 text-blue-500" />
      </div>
      <div className="max-w-[90%] space-y-2">
        {message.response ? (
          <ResponseRenderer response={message.response} />
        ) : (
          <div className="rounded-2xl px-4 py-2 text-sm bg-secondary/60 dark:bg-secondary/40 text-foreground">
            {message.content}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Response Renderer — table / number / error / info
// ---------------------------------------------------------------------------

function ResponseRenderer({ response }: { response: AnalyticsResponse }) {
  switch (response.type) {
    case 'table':
      return <TableRenderer response={response} />
    case 'number':
      return <NumberRenderer response={response} />
    case 'error':
      return <ErrorRenderer response={response} />
    case 'info':
      return <InfoRenderer response={response} />
    default:
      return null
  }
}

// --- Table ---
function TableRenderer({ response }: { response: Extract<AnalyticsResponse, { type: 'table' }> }) {
  const handleExport = () => {
    const csv = jsonToCsv(response.columns, response.rows)
    const timestamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`nexus-analytics-${timestamp}.csv`, csv)
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/80 overflow-hidden shadow-sm">
      {/* Table header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-secondary/30">
        <span className="text-xs font-medium text-muted-foreground">
          {response.rows.length} record{response.rows.length !== 1 ? 's' : ''}
          {response.note && (
            <span className="ml-1 text-amber-500">({response.note})</span>
          )}
        </span>
        {response.exportable && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={handleExport}
            id="analytics-export-csv"
          >
            <Download className="h-3 w-3" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Scrollable table */}
      <div className="overflow-auto max-h-[320px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-secondary/60 dark:bg-secondary/40">
            <tr>
              {response.columns.map(col => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap border-b border-border/30"
                >
                  {formatColumnHeader(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {response.rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-b border-border/20 last:border-0 hover:bg-secondary/20 transition-colors"
              >
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-3 py-2 whitespace-nowrap text-foreground/90"
                  >
                    {formatCellValue(cell, response.columns[cellIdx])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- Number (KPI) ---
function NumberRenderer({ response }: { response: Extract<AnalyticsResponse, { type: 'number' }> }) {
  return (
    <div className="rounded-xl border border-border/60 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-blue-500/5 p-5 text-center shadow-sm">
      <div className="text-3xl font-bold text-foreground tabular-nums">
        {typeof response.value === 'number'
          ? response.value.toLocaleString()
          : response.value}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{response.label}</div>
    </div>
  )
}

// --- Error ---
function ErrorRenderer({ response }: { response: Extract<AnalyticsResponse, { type: 'error' }> }) {
  return (
    <div className="space-y-2">
      <Alert variant="destructive" className="bg-destructive/5 border-destructive/20">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          {response.message}
        </AlertDescription>
      </Alert>
      {response.suggestions && response.suggestions.length > 0 && (
        <div className="px-1">
          <p className="text-xs text-muted-foreground mb-1.5">Try asking:</p>
          <div className="flex flex-wrap gap-1.5">
            {response.suggestions.map((s, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-[11px] font-normal cursor-default"
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Info ---
function InfoRenderer({ response }: { response: Extract<AnalyticsResponse, { type: 'info' }> }) {
  return (
    <Alert className="bg-secondary/40 border-border/40">
      <Info className="h-4 w-4 text-muted-foreground" />
      <AlertDescription className="text-sm text-muted-foreground">
        {response.message}
      </AlertDescription>
    </Alert>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert snake_case column names to Title Case */
function formatColumnHeader(col: string): string {
  return col
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

/** Format cell values for display */
function formatCellValue(value: unknown, column: string): string {
  if (value === null || value === undefined) return '—'

  // Currency formatting for known money columns
  if (
    typeof value === 'number' &&
    (column.includes('total') || column.includes('amount') || column.includes('rate'))
  ) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // Status formatting — return as-is for badges
  return String(value)
}

/** Get a plain text summary from a response (for screen readers / fallback) */
function getTextFromResponse(response: AnalyticsResponse): string {
  switch (response.type) {
    case 'table':
      return `Found ${response.rows.length} records.`
    case 'number':
      return `${response.label}: ${response.value}`
    case 'error':
      return response.message
    case 'info':
      return response.message
    default:
      return ''
  }
}
