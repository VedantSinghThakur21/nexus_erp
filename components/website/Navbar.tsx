"use client";

import Link from "next/link";
import { Box, ArrowUpRight } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="fixed w-full z-40 top-0 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group cursor-pointer">
          <div className="w-8 h-8 bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden group-hover:border-orange-500/50 transition-colors duration-500">
            <div className="absolute inset-0 bg-orange-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            <Box className="w-[18px] h-[18px] text-white relative z-10" />
          </div>
          <span className="font-sans font-bold tracking-tight text-lg text-white">
            NEXUS<span className="text-white/20">ERP</span>
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex gap-8 text-xs font-medium font-mono text-neutral-400 uppercase tracking-widest">
          <a href="#features" className="hover:text-white transition-colors">
            Platform
          </a>
          <a href="#architecture" className="hover:text-white transition-colors">
            Intelligence
          </a>
          <a href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </a>
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:flex px-4 py-2 text-xs font-mono font-medium text-white bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all items-center gap-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            SYSTEM_LOGIN
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 text-xs font-mono font-medium text-black bg-white hover:bg-neutral-200 transition-all flex items-center gap-2"
          >
            GET STARTED
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
