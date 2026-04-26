"use client";

import Link from "next/link";

export default function CTASection() {
  return (
    <section className="py-40 relative overflow-hidden flex flex-col items-center justify-center text-center">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-orange-500/20 to-indigo-500/20 rounded-full blur-[100px] animate-pulse-slow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-white/5 rounded-full blur-[50px]" />

      <div className="relative z-10">
        <h2 className="text-5xl md:text-7xl font-semibold tracking-tighter text-white mb-12">
          Ready to deploy?
        </h2>

        <Link
          href="/signup"
          className="group relative inline-flex items-center justify-center px-12 py-6 bg-white text-black rounded-full font-bold text-lg tracking-tight overflow-hidden transition-transform hover:scale-110 duration-500 shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)]"
        >
          <span className="relative z-10">Initialize Workspace</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neutral-200 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </Link>

        <p className="mt-8 text-neutral-500 font-mono text-xs">
          NO CREDIT CARD REQUIRED • SOC2 COMPLIANT
        </p>
      </div>
    </section>
  );
}
