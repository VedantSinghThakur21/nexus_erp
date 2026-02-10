"use client";

import Link from "next/link";
import {
  Satellite,
  ArrowUpRight,
  PlayCircle,
  PieChart,
  MapPin,
  Box,
  Users,
  TrendingUp,
} from "lucide-react";

export default function Hero() {
  return (
    <main className="relative pt-32 pb-20 overflow-hidden min-h-screen flex flex-col justify-center">
      {/* Background Blobs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
        <div className="flex flex-col items-center text-center mb-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8">
            <Satellite className="w-4 h-4 text-orange-500" />
            <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.2em]">
              Live Fleet Telemetry Active
            </span>
          </div>

          {/* Heading */}
          <h1 className="font-sans font-semibold text-5xl sm:text-6xl md:text-8xl lg:text-9xl tracking-tighter leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-neutral-600 mb-8 max-w-5xl mx-auto drop-shadow-2xl">
            COMMAND <br /> THE FLEET.
          </h1>

          {/* Subheading */}
          <p className="font-sans text-lg md:text-xl text-neutral-400 font-light max-w-2xl mx-auto leading-relaxed mb-12">
            The industrial operating system for the next century. Orchestrate
            heavy machinery, predict maintenance, and optimize revenue with
            military-grade precision.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              href="/signup"
              className="group relative px-8 py-4 bg-white text-black font-semibold tracking-tight transition-all hover:scale-105 overflow-hidden text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:animate-beam z-20" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                Deploy Instance
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </Link>
            <button className="px-8 py-4 bg-transparent border border-white/10 text-white font-medium hover:bg-white/5 transition-colors font-mono text-sm flex items-center justify-center gap-2">
              <PlayCircle className="w-5 h-5" />
              WATCH_DEMO_01
            </button>
          </div>
        </div>

        {/* 3D Dashboard Visualization */}
        <div className="perspective-container relative w-full max-w-5xl mx-auto h-[350px] sm:h-[400px] md:h-[600px] mt-12 group">
          {/* Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[80%] bg-orange-500/20 blur-[100px] rounded-full group-hover:bg-orange-500/30 transition-colors duration-700" />

          <div className="card-3d w-full h-full bg-[#0F0F10] border border-white/10 rounded-xl shadow-2xl overflow-hidden relative">
            {/* Title Bar */}
            <div className="h-12 border-b border-white/5 flex items-center justify-between px-6 bg-[#141415]">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              </div>
              <div className="font-mono text-[10px] text-neutral-600 tracking-widest">
                NEXUS_OS v4.0.2
              </div>
            </div>

            <div className="grid grid-cols-12 h-[calc(100%-3rem)] divide-x divide-white/5">
              {/* Sidebar Icons */}
              <div className="col-span-1 hidden md:flex flex-col items-center py-6 gap-6 bg-[#0A0A0B]">
                <PieChart className="w-5 h-5 text-white/40 hover:text-white transition" />
                <MapPin className="w-5 h-5 text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
                <Box className="w-5 h-5 text-white/40 hover:text-white transition" />
                <Users className="w-5 h-5 text-white/40 hover:text-white transition" />
              </div>

              {/* Main Map Area */}
              <div className="col-span-12 md:col-span-8 bg-[#0F0F10] relative">
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "radial-gradient(#333 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />

                {/* Floating Card - Unit */}
                <div className="absolute top-8 left-8 p-4 glass-panel rounded-lg border border-white/10 w-64 animate-float">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-mono text-neutral-400">
                      UNIT: CAT-992
                    </span>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mb-1">
                    <div className="h-full w-[75%] bg-green-500" />
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    FUEL LEVEL: 75%
                  </span>
                </div>

                {/* Floating Card - Revenue */}
                <div
                  className="absolute bottom-8 right-8 p-4 glass-panel rounded-lg border border-white/10 w-64 animate-float"
                  style={{ animationDelay: "1s" }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-mono text-neutral-400">
                      REVENUE VELOCITY
                    </span>
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="text-2xl font-sans font-medium text-white">
                    $42,900
                    <span className="text-neutral-500 text-sm">/hr</span>
                  </div>
                </div>
              </div>

              {/* Notifications Sidebar */}
              <div className="col-span-3 hidden md:block bg-[#0A0A0B] p-6 border-l border-white/5">
                <h3 className="text-xs font-mono text-neutral-500 mb-4 uppercase">
                  Notifications
                </h3>
                <div className="space-y-4">
                  <div className="p-3 rounded border border-white/5 bg-white/5">
                    <div className="text-xs text-orange-500 mb-1">
                      MAINTENANCE ALERT
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      Hydraulic pressure drop detected in Sector 4.
                    </div>
                  </div>
                  <div className="p-3 rounded border border-white/5 bg-transparent opacity-50">
                    <div className="text-xs text-blue-400 mb-1">
                      SYSTEM UPDATE
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      Firmware v2.1 installed successfully.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
