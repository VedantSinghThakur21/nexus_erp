'use client'

import Link from 'next/link'
import { Bot, Inbox, Lock, Settings2, Wrench } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AgentsChatClient, type AgentsInitialEntitlement } from './agents-chat-client'
import { AgentInboxTab } from './agent-inbox-tab'
import { AgentToolsTab } from './agent-tools-tab'
import { AgentSettingsTab } from './agent-settings-tab'

export function AgentWorkspaceClient({
  initialEntitlement,
}: {
  initialEntitlement: AgentsInitialEntitlement
}) {
  if (!initialEntitlement.allowed) {
    return (
      <div className="flex min-h-[min(100%,calc(100dvh-4rem))] flex-col items-center justify-center gap-5 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/80 ring-1 ring-border">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">AI Agent requires Pro</h2>
          <p className="text-sm text-muted-foreground">
            {initialEntitlement.reason || 'Upgrade to unlock agentic workflows, tools, and approvals.'}
          </p>
        </div>
        <Button asChild>
          <Link href="/settings/billing">View plans</Link>
        </Button>
      </div>
    )
  }

  const planLabel = initialEntitlement.plan ?? 'pro'

  return (
    <div className="flex min-h-[calc(100dvh-1px)] flex-col">
      <header className="shrink-0 border-b border-border/40 bg-gradient-to-b from-muted/30 to-background px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">Agentic AI</h1>
              <p className="text-xs text-muted-foreground">
                ERP-aware assistant · {initialEntitlement.siteName ?? 'tenant'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {planLabel}
            </Badge>
            <Button variant="outline" size="sm" asChild>
              <Link href="/agent">Open inbox</Link>
            </Button>
          </div>
        </div>
      </header>

      <Tabs defaultValue="chat" className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 px-4 pt-3 md:px-6">
          <TabsList className="h-9 w-full max-w-md justify-start sm:w-auto">
            <TabsTrigger value="chat" className="gap-1.5 text-xs sm:text-sm">
              <Bot className="h-3.5 w-3.5" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="inbox" className="gap-1.5 text-xs sm:text-sm">
              <Inbox className="h-3.5 w-3.5" />
              Inbox
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-1.5 text-xs sm:text-sm">
              <Wrench className="h-3.5 w-3.5" />
              Tools
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 text-xs sm:text-sm">
              <Settings2 className="h-3.5 w-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
          <AgentsChatClient initialEntitlement={initialEntitlement} embedded />
        </TabsContent>
        <TabsContent
          value="inbox"
          className="mt-0 flex-1 overflow-auto px-4 py-4 md:px-6 data-[state=inactive]:hidden"
        >
          <AgentInboxTab />
        </TabsContent>
        <TabsContent
          value="tools"
          className="mt-0 flex-1 overflow-auto px-4 py-4 md:px-6 data-[state=inactive]:hidden"
        >
          <AgentToolsTab />
        </TabsContent>
        <TabsContent
          value="settings"
          className="mt-0 flex-1 overflow-auto px-4 py-4 md:px-6 data-[state=inactive]:hidden"
        >
          <AgentSettingsTab entitlement={initialEntitlement} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
