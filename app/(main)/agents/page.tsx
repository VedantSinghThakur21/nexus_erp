"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PageHeader } from "@/components/page-header";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function AgentsPage() {
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: userMessageContent }],
          conversation_id: "",
          tenant_id: "master",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      addDebugLog(`✅ Response received: ${response.status} ${response.statusText}`);

      // Initialize assistant message
      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      let assistantMessageContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          addDebugLog(`✅ Message finished: ${assistantMessageContent.substring(0, 100)}...`);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        assistantMessageContent += chunk;

        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          if (newMessages[lastIndex].role === "assistant") {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              content: assistantMessageContent
            };
          }
          return newMessages;
        });
      }

    } catch (err: any) {
      console.error("Chat error:", err);
      setError(err);
      addDebugLog(`❌ Error: ${err.message}`);
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

  // Calculate KPIs from messages
  const kpis = useMemo(() => {
    const totalQueries = messages.filter((m) => m.role === "user").length;
    const accuracy = 98; // Mock - would need real calculation
    const efficiencyBoost = totalQueries * 3.5; // Mock calculation

    return {
      totalQueries: totalQueries > 1000 ? `${(totalQueries / 1000).toFixed(1)}k` : totalQueries,
      accuracy: `${accuracy}%`,
      efficiencyBoost: `${Math.round(efficiencyBoost)}h`,
    };
  }, [messages]);

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

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* KPI Cards - Matching Leads Page Styling */}
        <section className="w-full border-b border-border/60 bg-background/40">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-3 md:px-6 md:py-5">
            <div className="rounded-xl border border-border bg-card p-6 shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[12px] font-bold tracking-widest uppercase">
                  Total Queries
                </span>
                <div className="rounded-lg bg-slate-700/50 p-2 text-slate-300">
                  <span className="material-symbols-outlined text-xl">query_stats</span>
                </div>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-3xl font-bold text-foreground leading-none">{kpis.totalQueries}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[12px] font-bold tracking-widest uppercase">
                  Accuracy
                </span>
                <div className="rounded-lg bg-green-500/10 p-2 text-green-400">
                  <span className="material-symbols-outlined text-xl">verified</span>
                </div>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-3xl font-bold text-foreground leading-none">{kpis.accuracy}</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[12px] font-bold tracking-widest uppercase">
                  Efficiency Boost
                </span>
                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                  <span className="material-symbols-outlined text-xl">trending_up</span>
                </div>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <span className="text-3xl font-bold text-foreground leading-none">{kpis.efficiencyBoost}</span>
              </div>
            </div>
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
                          Alex Thompson
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
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
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
                              'Show me all leads'
                            </button>
                            <button
                              onClick={() => {
                                setInput("Find available 50T Cranes");
                              }}
                              className="px-3 py-1.5 bg-card dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-accent text-xs text-slate-600  rounded-full transition-all hover:shadow-md font-medium"
                            >
                              'Find available 50T Cranes'
                            </button>
                            <button
                              onClick={() => {
                                setInput("Create a lead for Acme Corp");
                              }}
                              className="px-3 py-1.5 bg-card dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-accent text-xs text-slate-600  rounded-full transition-all hover:shadow-md font-medium"
                            >
                              'Create a lead for Acme Corp'
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
              <h4 className="font-bold text-[8px]  uppercase tracking-[0.15em] text-muted-foreground">
                Action Preview
              </h4>
              <span className="material-symbols-outlined text-slate-400 text-sm">info</span>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-card dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                <p className="text-[7px] font-bold text-slate-400 uppercase mb-0.5 tracking-wider">
                  Source Module
                </p>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  CRM / Leads
                </p>
              </div>
              <div className="p-3 bg-card dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                <p className="text-[7px] font-bold text-slate-400 uppercase mb-0.5 tracking-wider">
                  Last Sync
                </p>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  2 minutes ago
                </p>
              </div>
              <div className="pt-5 mt-3 border-t border-slate-100 dark:border-slate-800">
                <h5 className="text-[7px] font-bold text-slate-400 uppercase mb-3 tracking-[0.08em]">
                  Quick Shortcuts
                </h5>
                <div className="space-y-1.5">
                  <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-background dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all text-xs group">
                    <span className="font-medium text-slate-600  group-hover:text-accent text-xs">
                      Export as CSV
                    </span>
                    <span className="material-symbols-outlined text-slate-400 text-base group-hover:text-accent">
                      download
                    </span>
                  </button>
                  <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-background dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all text-xs group">
                    <span className="font-medium text-slate-600  group-hover:text-accent text-xs">
                      Open in ERPNext
                    </span>
                    <span className="material-symbols-outlined text-slate-400 text-base group-hover:text-accent">
                      open_in_new
                    </span>
                  </button>
                </div>
              </div>
              <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <h5 className="text-[7px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1.5 tracking-wider">
                  Agent Intelligence
                </h5>
                <p className="text-[10px] text-slate-600  leading-relaxed">
                  Based on current leads, I suggest prioritizing{" "}
                  <strong>Global Tech Corp</strong> due to high interest score (8.9/10).
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
                <button
                  type="button"
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">attach_file</span>
                </button>
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
              <p className="text-[7px] text-slate-400 uppercase tracking-[0.25em] font-bold">
                AvarIQ v2.4 • Enterprise Suite
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
    </div>
  );
}