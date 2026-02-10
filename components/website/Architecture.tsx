"use client";

export default function Architecture() {
  return (
    <section
      className="py-32 bg-[#050505] border-t border-white/5 relative"
      id="architecture"
    >
      {/* Grid Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Left: Content */}
        <div>
          <h2 className="font-mono text-sm text-orange-500 uppercase tracking-widest mb-4">
            Data Core
          </h2>
          <h3 className="text-4xl font-semibold text-white tracking-tight mb-6">
            The heartbeat of <br />
            <span className="text-neutral-500">your operation.</span>
          </h3>
          <p className="text-neutral-400 mb-8 max-w-md">
            Access granular data from every asset instantly. From hydraulic
            pressure to revenue per hour, Nexus centralizes your intelligence in
            one accessible stream.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div className="p-4 border border-white/10 bg-[#0A0A0A]/50 backdrop-blur-sm">
              <div className="text-2xl font-mono text-white mb-1">50ms</div>
              <div className="text-xs text-neutral-500 uppercase">
                Stream Latency
              </div>
            </div>
            <div className="p-4 border border-white/10 bg-[#0A0A0A]/50 backdrop-blur-sm">
              <div className="text-2xl font-mono text-white mb-1">100%</div>
              <div className="text-xs text-neutral-500 uppercase">
                Data Fidelity
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Telemetry JSON Visualization */}
        <div className="bg-[#0c0c0c] border border-white/10 rounded-lg shadow-2xl overflow-hidden font-mono text-xs md:text-sm">
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#111] border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-neutral-700" />
              <div className="w-3 h-3 rounded-full bg-neutral-700" />
              <div className="w-3 h-3 rounded-full bg-neutral-700" />
              <span className="ml-2 text-neutral-500">
                live_telemetry_stream.json
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-green-500 uppercase tracking-widest">
                Live
              </span>
            </div>
          </div>

          {/* JSON Body */}
          <div className="p-6 text-neutral-300 space-y-1">
            <div>
              <span className="text-neutral-500">{"{"}</span>
            </div>
            <div className="pl-4">
              <span className="text-indigo-400">&quot;asset_id&quot;</span>:{" "}
              <span className="text-green-400">&quot;CRANE-LTM-1120&quot;</span>
              <span className="text-neutral-500">,</span>
            </div>
            <div className="pl-4">
              <span className="text-indigo-400">&quot;status&quot;</span>:{" "}
              <span className="text-green-400">&quot;ACTIVE&quot;</span>
              <span className="text-neutral-500">,</span>
            </div>
            <div className="pl-4">
              <span className="text-indigo-400">&quot;location&quot;</span>:{" "}
              <span className="text-neutral-500">{"{"}</span>
              <span className="text-indigo-400">&quot;lat&quot;</span>:{" "}
              <span className="text-amber-400">19.0760</span>,{" "}
              <span className="text-indigo-400">&quot;lng&quot;</span>:{" "}
              <span className="text-amber-400">72.8777</span>
              <span className="text-neutral-500">{"}"}</span>
              <span className="text-neutral-500">,</span>
            </div>
            <div className="pl-4">
              <span className="text-indigo-400">&quot;telemetry&quot;</span>:{" "}
              <span className="text-neutral-500">{"{"}</span>
            </div>
            <div className="pl-8">
              <span className="text-indigo-400">&quot;fuel_level&quot;</span>:{" "}
              <span className="text-green-400">&quot;87%&quot;</span>
              <span className="text-neutral-500">,</span>
            </div>
            <div className="pl-8">
              <span className="text-indigo-400">&quot;engine_hours&quot;</span>:{" "}
              <span className="text-amber-400">14203</span>
              <span className="text-neutral-500">,</span>
            </div>
            <div className="pl-8">
              <span className="text-indigo-400">
                &quot;next_maintenance&quot;
              </span>
              : <span className="text-green-400">&quot;in 48 hrs&quot;</span>
              <span className="text-neutral-500">,</span>
            </div>
            <div className="pl-8">
              <span className="text-indigo-400">
                &quot;vibration_sensor&quot;
              </span>
              : <span className="text-neutral-500">&quot;NORMAL&quot;</span>
            </div>
            <div className="pl-4">
              <span className="text-neutral-500">{"}"}</span>
            </div>
            <div className="typing-cursor">
              <span className="text-neutral-500">{"}"}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
