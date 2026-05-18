"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MarkdownBodyLazy } from "@/components/agents/markdown-body-lazy";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type AgentsInitialEntitlement = {
  allowed: boolean;
  reason?: string;
  plan?: string;
  flags?: Record<string, boolean>;
  siteName?: string;
  tools?: unknown[];
};

export function AgentsChatClient({
  initialEntitlement,
  embedded = false,
}: {
  initialEntitlement: AgentsInitialEntitlement;
  embedded?: boolean;
}) {
  const entitlement = initialEntitlement;
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm **AvarIQ**, your autonomous agent. I can help you manage Leads, Fleet, Customers, and Invoices.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[DEBUG] ${message}`);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!entitlement?.allowed) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: entitlement?.reason || "Agentic AI is not enabled for this tenant.",
        },
      ]);
      return;
    }

    const userMessageContent = input;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessageContent,
    };

    setInput("");
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    addDebugLog(`📤 Sending message: "${userMessageContent}"`);

    try {
      const response = await fetch("/api/agentic/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessageContent,
          mode: "chat",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to send message: ${response.statusText}`);
      }

      addDebugLog(`✅ Response received: ${response.status} ${response.statusText}`);

      const citations = data.result?.citations?.length
        ? `\n\nSources: ${data.result.citations.map((item: { title: string }) => item.title).join(", ")}`
        : "";
      const assistantMessageContent = `${data.result?.answer || "No response generated."}${citations}`;
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: assistantMessageContent },
      ]);
      addDebugLog(`✅ Message finished: ${assistantMessageContent.substring(0, 100)}...`);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown chat error";
      console.error("Chat error:", err);
      setError(err instanceof Error ? err : new Error(errorMessage));
      addDebugLog(`❌ Error: ${errorMessage}`);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", content: "Sorry, I'm having trouble connecting to the AI right now." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <div className="flex min-h-full flex-col overflow-hidden">
      {/* Debug Toggle Button */}
      {showDebug && (
        <div className="fixed bottom-20 right-4 w-96 max-h-96 bg-black text-green-400 p-4 rounded-lg shadow-2xl overflow-y-auto font-mono text-xs z-50">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold">🐛 DEBUG LOGS</span>
            <button
              onClick={() => setDebugLogs([])}
              className="text-red-400 hover:text-red-300"
            >
              Clear
            </button>
          </div>
          {debugLogs.map((log, i) => (
            <div key={i} className="mb-1 border-b border-green-900 pb-1">
              {log}
            </div>
          ))}
          {error && (
            <div className="mt-2 p-2 bg-red-900 text-red-200 rounded">ERROR: {error.message}</div>
          )}
        </div>
      )}

      {/* Header */}
      <PageHeader />

      {!embedded && !entitlement.allowed && (
        <main className="flex-1 px-4 py-6 md:px-6">
          <section className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Agentic AI Plugin
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-foreground">Upgrade or enable Agentic AI</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {entitlement?.reason || "Agentic AI requires Pro or Enterprise plus the tenant feature flag."}
            </p>
            <div className="mt-5 rounded-xl border border-dashed border-border bg-background/60 p-4 text-xs text-muted-foreground">
              Current plan: {entitlement?.plan || "unknown"}. Required flag: agentic_ai_enabled.
            </div>
          </section>
        </main>
      )}

      {(embedded || entitlement.allowed) && (
      <main className="flex-1 flex flex-col overflow-hidden">
        <section className="w-full border-b border-border/60 bg-muted/25">
          <div className="mx-auto max-w-6xl px-4 py-4 md:px-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Agentic AI</span> reads your tenant’s ERPNext data through Nexus.
              Side-effecting tool runs may need a human step in{" "}
              <Link href="/agent" className="font-medium text-primary underline-offset-4 hover:underline">
                Agent inbox
              </Link>
              {" "}before they apply in Frappe.
            </p>
          </div>
        </section>

        {/* Chat Area with Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Chat Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 md:px-6">
              {messages.map((m, index) => {
                const isUser = m.role === "user";
                const isFirstMessage = index === 0;

                if (isUser) {
                  return (
                    <div key={m.id} className="flex gap-5 justify-end">
                      <div className="space-y-1 max-w-[70%] text-right">
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                          You
                        </p>
                        <div className="bg-accent text-white px-4 py-2 rounded-xl rounded-tr-none shadow-md inline-block">
                          <p className="text-xs font-medium">{m.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={m.id} className="flex gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-card p-2 shadow-none">
                      <svg
                        className="w-full h-full"
                        fill="none"
                        viewBox="0 0 100 100"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="50" cy="55" fill="white" r="35"></circle>
                        <circle cx="50" cy="55" fill="#0F172A" r="30"></circle>
                        <circle cx="40" cy="55" fill="white" r="5"></circle>
                        <circle cx="60" cy="55" fill="white" r="5"></circle>
                        <path
                          d="M45 65 Q50 68 55 65"
                          stroke="white"
                          strokeLinecap="round"
                          strokeWidth="2"
                        ></path>
                        <circle cx="50" cy="15" fill="white" r="6"></circle>
                        <rect fill="white" height="10" rx="2" width="4" x="48" y="20"></rect>
                      </svg>
                    </div>
                    <div className="space-y-4 flex-1">
                      {isFirstMessage && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">
                            AvarIQ Agent{" "}
                            <span className="text-[7px] text-slate-400 font-normal ml-1">
                              Just now
                            </span>
                          </h4>
                        </div>
                      )}
                      <div className="bg-card dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl rounded-tl-none shadow-sm">
                        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700  leading-relaxed text-xs">
                          <MarkdownBodyLazy content={m.content} />
                        </div>
                      </div>
                      {isFirstMessage && (
                        <div className="space-y-2">
                          <p className="text-[8px] font-bold text-slate-400  uppercase ml-0.5 tracking-wider">
                            Try asking:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => {
                                setInput("Show me all leads");
                              }}
                              className="px-3 py-1.5 bg-card dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-accent text-xs text-slate-600  rounded-full transition-all hover:shadow-md font-medium"
                            >
                              Show me all leads
                            </button>
                            <button
                              onClick={() => {
                                setInput("Find available 50T Cranes");
                              }}
                              className="px-3 py-1.5 bg-card dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-accent text-xs text-slate-600  rounded-full transition-all hover:shadow-md font-medium"
                            >
                              Find available 50T Cranes
                            </button>
                            <button
                              onClick={() => {
                                setInput("Create a lead for Acme Corp");
                              }}
                              className="px-3 py-1.5 bg-card dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-accent text-xs text-slate-600  rounded-full transition-all hover:shadow-md font-medium"
                            >
                              Create a lead for Acme Corp
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Loading Indicator */}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card p-1.5 shadow-none">
                    <svg
                      className="w-full h-full"
                      fill="none"
                      viewBox="0 0 100 100"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="50" cy="55" fill="white" r="35"></circle>
                      <circle cx="50" cy="55" fill="#0F172A" r="30"></circle>
                      <circle cx="40" cy="55" fill="white" r="5"></circle>
                      <circle cx="60" cy="55" fill="white" r="5"></circle>
                      <path
                        d="M45 65 Q50 68 55 65"
                        stroke="white"
                        strokeLinecap="round"
                        strokeWidth="2"
                      ></path>
                      <circle cx="50" cy="15" fill="white" r="6"></circle>
                      <rect fill="white" height="10" rx="2" width="4" x="48" y="20"></rect>
                    </svg>
                  </div>
                  <div className="bg-card dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl rounded-tl-none shadow-sm flex-1">
                    <p className="text-sm font-medium text-slate-700 ">
                      Fetching data from ERPNext Database...
                    </p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="hidden w-72 overflow-y-auto border-l border-border bg-background/50 p-5 xl:block">
            <div className="flex items-center justify-between mb-5">
              <h4 className="font-bold text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Workspace
              </h4>
            </div>
            <div className="space-y-4 text-xs text-muted-foreground">
              <div className="rounded-lg border border-border bg-card p-3 shadow-none">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
                  Approvals
                </p>
                <p className="mt-2 leading-relaxed">
                  Pending writes from the agent are listed under{" "}
                  <Link href="/agent" className="font-medium text-primary underline-offset-4 hover:underline">
                    Agent inbox
                  </Link>
                  .
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 shadow-none">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
                  ERPNext
                </p>
                <p className="mt-2 leading-relaxed">
                  Answers use live data from your site. If something looks off, verify the record in Frappe.
                </p>
              </div>
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
                <p className="text-[10px] font-medium text-foreground">
                  Tip
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed">
                  Citations in replies point to the documents the model used; open them in ERPNext to double-check.
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className="border-t border-border/40 bg-card px-4 py-4 md:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <form onSubmit={handleCustomSubmit}>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-background/80 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 pr-1.5 shadow-inner focus-within:ring-2 focus-within:ring-accent/20 transition-all">
                <input
                  value={input}
                  onChange={handleInputChange}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-xs text-slate-700 placeholder-slate-400 dark:placeholder-slate-500 py-2 outline-none bg-background border-border/60 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Type your request (e.g., 'Draft invoice for ACME corp')..."
                  type="text"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="w-9 h-9 bg-accent hover:bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-md transition-all active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    send
                  </span>
                </button>
              </div>
            </form>
            <div className="flex items-center justify-between mt-3">
              <p className="text-[10px] text-muted-foreground">
                Nexus · Agentic AI
              </p>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-[7px] text-slate-400 uppercase tracking-[0.08em] font-bold flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined text-xs">bug_report</span> Debug Mode
              </button>
            </div>
          </div>
        </footer>
      </main>
      )}
    </div>
  );
}