'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
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
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">AI Agent requires Pro plan</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {initialEntitlement.reason || 'Upgrade to unlock the agentic AI workflow.'}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/settings/billing">View plans</Link>
        </Button>
      </div>
    )
  }

  return (
    <Tabs defaultValue="chat" className="flex h-full flex-col">
      <TabsList className="mx-4 mt-4 w-fit">
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="inbox">Inbox</TabsTrigger>
        <TabsTrigger value="tools">Tools</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="chat" className="mt-0 flex-1 overflow-hidden">
        <AgentsChatClient initialEntitlement={initialEntitlement} embedded />
      </TabsContent>
      <TabsContent value="inbox" className="flex-1 overflow-auto p-4">
        <AgentInboxTab />
      </TabsContent>
      <TabsContent value="tools" className="flex-1 overflow-auto p-4">
        <AgentToolsTab />
      </TabsContent>
      <TabsContent value="settings" className="flex-1 overflow-auto p-4">
        <AgentSettingsTab entitlement={initialEntitlement} />
      </TabsContent>
    </Tabs>
  )
}
