'use client'

import { useChat } from 'ai/react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Bot, Send, User, Sparkles, Loader2 } from "lucide-react"
import { useEffect, useRef } from 'react'

export default function AgentsPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col bg-slate-50 dark:bg-slate-950">
      
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-8 text-center opacity-80">
            <div className="rounded-full bg-blue-100 p-6 dark:bg-blue-900/30">
              <Bot className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Nexus Agent</h2>
              <p className="text-slate-500">
                I am connected to your live ERP database. Ask me about your business.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                {["What is our total revenue?", "Find leads named 'Vedant'", "Create a task to 'Email Client'", "Show me pending tasks"].map((q) => (
                    <button 
                        key={q}
                        onClick={() => {
                            const event = { target: { value: q } } as any;
                            handleInputChange(event);
                        }}
                        className="p-4 text-sm text-left rounded-xl border bg-white hover:bg-slate-50 hover:border-blue-300 transition-all dark:bg-slate-900 dark:border-slate-800"
                    >
                        <Sparkles className="h-4 w-4 inline mr-2 text-blue-500" />
                        {q}
                    </button>
                ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role !== 'user' && (
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Bot className="h-5 w-5 text-blue-600" />
                    </div>
                )}
                
                <div className={`rounded-2xl px-5 py-3 max-w-[80%] shadow-sm ${
                    m.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-200 border'
                }`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                  {m.toolInvocations?.map((toolCall) => (
                    <div key={toolCall.toolCallId} className="mt-2 text-xs bg-black/5 dark:bg-white/10 p-2 rounded flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Using tool: <span className="font-mono font-semibold">{toolCall.toolName}</span>
                    </div>
                  ))}
                </div>

                {m.role === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-slate-600" />
                    </div>
                )}
              </div>
            ))}
            {isLoading && (
                <div className="flex gap-4 max-w-3xl mx-auto">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Bot className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex items-center gap-1 bg-white px-4 py-3 rounded-2xl border">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl relative flex items-center">
          <Input 
            className="pr-12 py-6 rounded-full border-slate-300 dark:border-slate-800 focus-visible:ring-blue-500 shadow-sm"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask anything..."
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || !input}
            className="absolute right-2 rounded-full h-10 w-10 bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        </form>
      </div>
    </div>
  )
}


