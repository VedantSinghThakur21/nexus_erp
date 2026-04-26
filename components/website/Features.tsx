"use client";

import { MapPin, Wallet, Zap, ShieldCheck, Sparkles } from "lucide-react";

export default function Features() {
  return (
    <section
      className="py-32 bg-[#080808] border-t border-white/5"
      id="features"
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="mb-20 max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tighter text-white mb-4">
            Total Visibility. <br />
            <span className="text-neutral-500">Zero Latency.</span>
          </h2>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 auto-rows-[320px]">
          {/* Card 1: Fleet Command — Orange Moving Border */}
          <div
            className="moving-border-container col-span-1"
            style={{ "--border-color": "#F97316" } as React.CSSProperties}
          >
            <div className="moving-border-bg" />
            <div className="card-content-landing p-8 flex flex-col justify-between group overflow-hidden relative">
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent" />

              <div className="relative z-10 flex justify-between items-start">
                <div className="p-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div className="px-2 py-1 bg-orange-500/10 border border-orange-500/20 rounded text-[10px] text-orange-500 font-mono uppercase animate-pulse">
                  Global Tracking
                </div>
              </div>

              {/* Animated Pings */}
              <div className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="absolute top-[40%] left-[30%] w-3 h-3 bg-orange-500/20 rounded-full flex items-center justify-center animate-ping" />
                <div className="absolute top-[40%] left-[30%] w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_15px_#F97316]" />

                <div
                  className="absolute top-[60%] right-[30%] w-3 h-3 bg-blue-500/20 rounded-full flex items-center justify-center animate-ping"
                  style={{ animationDelay: "0.5s" }}
                />
                <div className="absolute top-[60%] right-[30%] w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_15px_#3B82F6]" />
              </div>

              <div className="relative z-10">
                <h3 className="text-2xl font-semibold text-white mb-2">
                  Fleet Command
                </h3>
                <p className="text-sm text-neutral-400 max-w-xs">
                  Real-time geospatial visualization of every asset in your
                  inventory.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Deal Velocity — Indigo Moving Border */}
          <div
            className="moving-border-container col-span-1"
            style={{ "--border-color": "#6366F1" } as React.CSSProperties}
          >
            <div className="moving-border-bg" />
            <div className="card-content-landing p-8 flex flex-col justify-between relative overflow-hidden group">
              {/* Kanban Lines */}
              <div className="absolute inset-0 opacity-20 flex justify-between px-12 pt-12 pb-20 pointer-events-none">
                <div className="w-[2px] h-full bg-white/5 border-r border-dashed border-white/10" />
                <div className="w-[2px] h-full bg-white/5 border-r border-dashed border-white/10" />
              </div>

              <div className="relative z-10 flex justify-between items-start">
                <div className="p-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.2)] animate-float">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span className="text-[10px] font-semibold text-indigo-400">
                    AI Quote Sent: $45k
                  </span>
                </div>
              </div>

              {/* Sliding Card */}
              <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 px-12 h-20 pointer-events-none">
                <div className="w-40 h-full bg-[#1A1A1C] border border-white/10 rounded-lg shadow-2xl p-3 flex flex-col justify-center gap-2 animate-card-slide relative z-20">
                  <div className="w-12 h-1 bg-white/10 rounded-full" />
                  <div className="w-20 h-1 bg-white/10 rounded-full" />
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-green-500 rounded-full blur-md opacity-50" />
                </div>
                <div className="absolute bottom-[-40px] left-12 text-[10px] font-mono text-neutral-600 uppercase">
                  Lead
                </div>
                <div className="absolute bottom-[-40px] left-1/2 -translate-x-1/2 text-[10px] font-mono text-neutral-600 uppercase">
                  Negotiation
                </div>
                <div className="absolute bottom-[-40px] right-12 text-[10px] font-mono text-neutral-600 uppercase">
                  Won
                </div>
              </div>

              <div className="relative z-10 mt-auto">
                <h3 className="text-2xl font-semibold text-white mb-2">
                  Deal Velocity
                </h3>
                <p className="text-sm text-neutral-400 max-w-xs">
                  Automated Sales. From lead to close with zero human friction.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Uptime */}
          <div className="col-span-1 glass-panel rounded-2xl p-6 relative overflow-hidden border border-white/10 hover:border-white/20 transition-colors">
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
              <svg viewBox="0 0 100 100" className="w-full h-full rotate-[-90deg]">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="white"
                  strokeWidth="8"
                  strokeDasharray="251"
                  strokeDashoffset="50"
                />
              </svg>
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <Zap className="w-6 h-6 text-yellow-400" />
              <div>
                <div className="text-4xl font-bold font-mono text-white mb-1">
                  99.9<span className="text-lg text-neutral-500">%</span>
                </div>
                <div className="text-xs text-neutral-400 uppercase tracking-wider">
                  System Uptime
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Security */}
          <div className="col-span-1 glass-panel rounded-2xl p-6 relative overflow-hidden border border-white/10 hover:border-white/20 transition-colors">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <ShieldCheck className="w-6 h-6 text-green-400" />
                <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-xl font-bold text-white">SOC-2</div>
                  <span className="px-1.5 py-0.5 rounded bg-green-900/30 text-[10px] text-green-400 border border-green-900/50">
                    COMPLIANT
                  </span>
                </div>
                <div className="text-xs text-neutral-400">
                  End-to-end military grade encryption.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
