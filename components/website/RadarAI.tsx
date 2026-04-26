"use client";

import { CheckCircle } from "lucide-react";

export default function RadarAI() {
  return (
    <section className="py-32 relative border-t border-white/5 bg-[#050505]">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        {/* Radar Visualization */}
        <div className="relative w-full aspect-square max-w-md mx-auto">
          {/* Concentric Circles */}
          <div className="absolute inset-0 border border-white/5 rounded-full" />
          <div className="absolute inset-[15%] border border-white/5 rounded-full" />
          <div className="absolute inset-[30%] border border-white/5 rounded-full" />
          <div className="absolute inset-[45%] border border-white/5 rounded-full" />

          {/* Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-[1px] bg-white/5" />
            <div className="absolute h-full w-[1px] bg-white/5" />
          </div>

          {/* Primary Blip with Tooltip */}
          <div className="absolute top-[30%] left-[60%] w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-48 p-3 glass-panel rounded border border-orange-500/30">
              <div className="flex items-start gap-2">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shrink-0" />
                <div>
                  <p className="text-[10px] font-mono text-orange-500 uppercase tracking-wider mb-1">
                    ATTENTION REQUIRED
                  </p>
                  <p className="text-xs text-neutral-300 leading-tight">
                    Crane-04 needs hydraulic fluid replacement.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Blips */}
          <div className="absolute top-[70%] left-[30%] w-1.5 h-1.5 bg-neutral-600 rounded-full" />
          <div className="absolute top-[20%] left-[40%] w-1.5 h-1.5 bg-neutral-600 rounded-full" />
        </div>

        {/* Text Content */}
        <div>
          <h2 className="font-sans text-4xl md:text-5xl font-semibold tracking-tighter mb-6">
            Agentic AI that watches your fleet{" "}
            <span className="text-neutral-600">so you don&apos;t have to.</span>
          </h2>
          <p className="text-neutral-400 text-lg font-light leading-relaxed mb-8">
            Nexus doesn&apos;t just track location. It ingests thousands of
            sensor points per second to predict failures before they happen. Our
            neural engine optimizes routing, fuel consumption, and asset
            allocation in real-time.
          </p>

          <ul className="space-y-4 font-mono text-sm text-neutral-300">
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-orange-500 shrink-0" />
              Predictive Maintenance Modeling
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-orange-500 shrink-0" />
              Automated Parts Procurement
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-orange-500 shrink-0" />
              Operator Efficiency Scoring
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
