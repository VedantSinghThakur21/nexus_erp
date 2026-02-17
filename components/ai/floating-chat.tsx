'use client'

import React, { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles, Send, Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function FloatingAIChat() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Hide on /agents page to avoid double chat
  if (pathname === '/agents') {
    return null
  }

  async function handleSend(userMessage: string) {
    if (!userMessage.trim() || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
          conversation_id: "",
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      // Initialize assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      let assistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantMessage += chunk;

        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: assistantMessage
          };
          return newMessages;
        });
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting to the AI right now." }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setOpen(true)}
        aria-label="Open chat"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 hover:from-blue-700 hover:via-blue-600 hover:to-purple-700 border-0 transition-all duration-300 hover:scale-110"
        size="icon"
      >
        <Sparkles className="h-6 w-6 text-white" />
      </Button>

      {/* Chat Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-lg font-semibold">AI Assistant</SheetTitle>
                  <p className="text-sm text-gray-500">How can I help you today?</p>
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  👋 Hello! I'm your AI assistant. I can help you with:
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1 ml-4 list-disc">
                  <li>Creating and managing opportunities</li>
                  <li>Generating quotations and invoices</li>
                  <li>Analyzing your sales pipeline</li>
                  <li>Answering questions about your data</li>
                </ul>
              </div>

              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                  )}

                  <div className={`rounded-2xl px-4 py-2 max-w-[80%] text-sm ${msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                    }`}>
                    {msg.content}
                  </div>

                  {msg.role === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t p-4 bg-white dark:bg-slate-950 shrink-0">
              <ChatInput onSend={handleSend} isLoading={isLoading} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function ChatInput({ onSend, isLoading }: { onSend: (msg: string) => void, isLoading: boolean }) {
  const [message, setMessage] = useState("");

  function handleSend() {
    if (!message.trim() || isLoading) return;
    onSend(message);
    setMessage("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Ask me anything..."
          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-transparent"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <Button
          className="px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
          onClick={handleSend}
          aria-label="Send message"
          disabled={isLoading}
        >
          {isLoading ? '...' : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Press Enter to send
      </p>
    </>
  );
}
