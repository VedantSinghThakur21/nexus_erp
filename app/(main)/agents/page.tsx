'use client'

// @ts-ignore
import { useChat } from 'ai/react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Bot, Send, User, Sparkles, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useEffect, useRef } from "react"
// @ts-ignore
import ReactMarkdown from 'react-markdown'

export default function AgentsPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    initialMessages: [
      {
        id: '1',
        role: 'assistant',
        content: "Hello! I am Nexus. I can help you manage Leads, Fleet, and Invoices. Try asking: **'Find available 50T Cranes'** or **'Create a lead for John Doe'**."
      }
    ]
  })
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-4xl mx-auto w-full p-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-6 border-b border-slate-100 dark:border-slate-800 mb-4">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
            <Bot className="h-6 w-6" />
        </div>
        <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Nexus AI Agent</h1>
            <p className="text-sm text-slate-500">Your autonomous ERP assistant</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-4 pb-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {messages.map((m: any) => (
          <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white'
            }`}>
              {m.role === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>

            {/* Message Bubble */}
            <Card className={`p-4 max-w-[85%] ${
              m.role === 'user' 
                ? 'bg-slate-900 text-white border-slate-900' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}>
              {/* Using ReactMarkdown to render tables/lists nicely */}
              <div className={`prose prose-sm ${m.role === 'user' ? 'prose-invert' : 'dark:prose-invert'} max-w-none`}>
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
              
              {/* Tool Invocation Indicator (Optional Polish) */}
                {m.toolInvocations?.map((toolInvocation: any) => (
                  <div key={toolInvocation.toolCallId} className="mt-3 pt-3 border-t border-dashed border-slate-200/20 text-xs opacity-70">
                    <span className="flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> 
                      Running tool: <span className="font-mono bg-black/10 px-1 rounded">{toolInvocation.toolName}</span>
                    </span>
                  </div>
                ))}
            </Card>
          </div>
        ))}
        {isLoading && (
            <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4" />
                </div>
                <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
                    </div>
                </Card>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="pt-4">
        <form onSubmit={handleSubmit} className="flex gap-2 relative">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask Nexus to do something..."
            className="pr-12 h-12 text-base shadow-sm"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || !input.trim()} 
            className="absolute right-1 top-1 h-10 w-10 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-xs text-center text-slate-400 mt-2">
            Nexus can execute real actions. Always review created records.
        </p>
      </div>
    </div>
  )
}