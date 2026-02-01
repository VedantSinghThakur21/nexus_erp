'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function FloatingAIChat() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Hide on /agents page to avoid double chat
  if (pathname === '/agents') {
    return null
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
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          <SheetHeader className="p-6 pb-4 border-b">
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
          
          <div className="h-[calc(100vh-140px)] flex flex-col p-6">
            {/* Chat Messages Area */}
            <div className="flex-1 overflow-auto mb-4 space-y-4">
              <div className="bg-gray-100 rounded-xl p-4">
                <p className="text-sm text-gray-700">
                  👋 Hello! I'm your AI assistant. I can help you with:
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
                  <li>• Creating and managing opportunities</li>
                  <li>• Generating quotations and invoices</li>
                  <li>• Analyzing your sales pipeline</li>
                  <li>• Answering questions about your data</li>
                </ul>
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t pt-4">
              <ChatInput />
            </div>

function ChatInput() {
  const [message, setMessage] = useState("");

  function handleSend() {
    if (!message.trim()) return;
    // TODO: send message to chat logic here
    setMessage("");
  }

  function handleKeyDown(e) {
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
          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button
          className="px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          onClick={handleSend}
          aria-label="Send message"
        >
          Send
        </Button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Press Enter to send • Shift+Enter for new line
      </p>
    </>
  );
}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
