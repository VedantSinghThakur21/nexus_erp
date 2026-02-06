'use client'

import { useChat } from 'ai/react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Bot, Send, User, Sparkles, Loader2, Bug } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useEffect, useRef, useState } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function AgentsPage() {
  const [showDebug, setShowDebug] = useState(false)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(`[DEBUG] ${message}`)
  }

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, setMessages } = useChat({
    api: '/api/chat',
    streamProtocol: 'text',
    
    body: {
      tenant_id: 'master', // Match your ERPNext tenant
    },
    
    initialMessages: [
      {
        id: '1',
        role: 'assistant',
        content: "Hello! I'm **Nexus AI**, your ERPNext assistant. I can help you manage Leads, Fleet, Customers, and Invoices.\n\n**Try asking:**\n- 'Show me all leads'\n- 'Find available 50T Cranes'\n- 'Create a lead for Acme Corp'\n- 'Show me overdue invoices'"
      }
    ],
    
    onResponse: (response) => {
      addDebugLog(`✅ Response received: ${response.status} ${response.statusText}`)
      addDebugLog(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`)
    },
    
    onFinish: (message) => {
      addDebugLog(`✅ Message finished: ${message.content.substring(0, 100)}...`)
    },
    
    onError: (error) => {
      addDebugLog(`❌ Error: ${error.message}`)
      console.error("Chat Error:", error)
    }
  })
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleCustomSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    addDebugLog(`📤 Sending message: "${input}"`)
    handleSubmit(e)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-4xl mx-auto w-full p-4" suppressHydrationWarning>
      {/* Debug Toggle Button */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="fixed top-4 right-4 z-50 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600"
        title="Toggle Debug Mode"
      >
        <Bug className="h-4 w-4" />
      </button>

      {/* Debug Panel */}
      {showDebug && (
        <div className="fixed bottom-20 right-4 w-96 max-h-96 bg-black text-green-400 p-4 rounded-lg shadow-2xl overflow-y-auto font-mono text-xs z-50">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold">🐛 DEBUG LOGS</span>
            <button onClick={() => setDebugLogs([])} className="text-red-400 hover:text-red-300">Clear</button>
          </div>
          {debugLogs.map((log, i) => (
            <div key={i} className="mb-1 border-b border-green-900 pb-1">{log}</div>
          ))}
          {error && (
            <div className="mt-2 p-2 bg-red-900 text-red-200 rounded">
              ERROR: {error.message}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 pb-6 border-b border-slate-100 dark:border-slate-800 mb-4">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
          <Bot className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Nexus AI Agent</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Your autonomous ERPNext assistant {isLoading && <span className="text-indigo-500">(Processing...)</span>}
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-4 pb-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {messages.map((m, index) => (
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
              <div className={`prose prose-sm ${
                m.role === 'user' ? 'prose-invert' : 'dark:prose-invert'
              } max-w-none prose-table:text-xs prose-th:bg-slate-100 dark:prose-th:bg-slate-800`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.content}
                </ReactMarkdown>
              </div>
              {showDebug && (
                <div className="mt-2 text-xs text-slate-400 border-t pt-2">
                  ID: {m.id} | Role: {m.role} | Length: {m.content.length} chars
                </div>
              )}
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
            className="pr-12 h-12 text-base shadow-sm border-slate-200 dark:border-slate-700 focus:border-indigo-500"
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
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Nexus can execute real ERP actions. Always review created records.
          </p>
          {showDebug && (
            <p className="text-xs text-green-500">
              Debug Mode: ON | Messages: {messages.length} | Tenant: master
            </p>
          )}
        </div>
      </div>
    </div>
  )
}