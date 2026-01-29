'use client'

import { useChat } from 'ai/react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Bot, Send, User, Sparkles, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useEffect, useRef } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function AgentsPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat({
    api: '/api/chat',
    streamProtocol: 'text', 
    initialMessages: [
      {
        id: '1',
        role: 'assistant',
        content: "Hello! I'm **Nexus AI**, your ERPNext assistant. I can help you manage Leads, Fleet, Customers, and Invoices.\n\n**Try asking:**\n- 'Find available 50T Cranes'\n- 'Create a lead for Acme Corp'\n- 'Show me overdue invoices'\n- 'List all customers'"
      }
    ],
    // FIX: Add tenant context to every message sent to the backend
    body: {
      tenant_id: 'TENANT-001', // This should come from your auth/session context
    },
    onError: (error) => {
      console.error("Chat Error:", error)
    }
  })
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // FIX: Custom submit handler to add tenant context
  const handleCustomSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    // Call the default submit which will include the body with tenant_id
    handleSubmit(e)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-4xl mx-auto w-full p-4" suppressHydrationWarning>
      {/* Header */}
      <div className="flex items-center gap-3 pb-6 border-b border-slate-100 dark:border-slate-800 mb-4">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Bot className="h-6 w-6" />
        </div>
        <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Nexus AI Agent</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Your autonomous ERPNext assistant</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-4 pb-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {messages.map(m => (
          <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              m.role === 'user' 
                ? 'bg-slate-900 dark:bg-slate-700 text-white' 
                : 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg'
            }`}>
              {m.role === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>

            {/* Message Bubble */}
            <Card className={`p-4 max-w-[85%] ${
              m.role === 'user' 
                ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-900 dark:border-slate-700' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}>
              {/* Using ReactMarkdown to render tables/lists nicely */}
              <div className={`prose prose-sm ${
                m.role === 'user' ? 'prose-invert' : 'dark:prose-invert'
              } max-w-none prose-table:text-xs prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-td:border prose-th:border`}>
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Custom styling for tables
                    table: ({node, ...props}) => (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm" {...props} />
                      </div>
                    ),
                    // Custom styling for status emojis (they render well by default)
                    p: ({node, ...props}) => <p className="my-2" {...props} />,
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>
            </Card>
          </div>
        ))}
        
        {/* Loading Indicator */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-4 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600/50 to-purple-600/50 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4" />
                </div>
                <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" /> Nexus is thinking...
                    </div>
                </Card>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="pt-4">
        <form onSubmit={handleCustomSubmit} className="flex gap-2 relative">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask Nexus to manage leads, fleet, or invoices..."
            className="pr-12 h-12 text-base shadow-sm border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || !input.trim()} 
            className="absolute right-1 top-1 h-10 w-10 bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-2">
            Nexus can execute real ERP actions. Always review created records.
        </p>
      </div>
    </div>
  )
}