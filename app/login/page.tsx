import Link from "next/link"
import { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"
import { AuroraBackground } from "@/components/aurora-background"

export const metadata: Metadata = {
  title: "Sign in - Nexus ERP",
}

export default function LoginPage() {
  return (
    <div className="landing-page relative min-h-screen overflow-hidden text-neutral-200">
      <AuroraBackground className="fixed inset-0 -z-10 !h-screen !w-screen bg-[#050505] text-neutral-200" />
      <div className="noise-overlay" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="w-full border-b border-white/5 bg-[#050505]/70 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden group-hover:border-orange-500/50 transition-colors duration-500">
                <div className="absolute inset-0 bg-orange-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-white font-bold">N</span>
              </div>
              <span className="font-sans font-bold tracking-tight text-lg text-white">
                nexus<span className="text-white/20">erp</span>
              </span>
            </Link>

            <div className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
              System Login
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-md">
            <div className="glass-panel rounded-2xl border border-white/10 p-8 shadow-2xl">
              <div className="mb-8 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                  <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.2em]">
                    Secure Access
                  </span>
                </div>

                <h1 className="font-sans font-semibold text-3xl tracking-tight text-white mb-2">
                  Welcome back
                </h1>
                <p className="text-sm text-neutral-400">
                  Sign in to your workspace
                </p>
              </div>

              <LoginForm />

              <p className="mt-6 text-center text-xs text-neutral-500 font-mono">
                By signing in, you agree to our{" "}
                <a
                  href="#"
                  className="underline underline-offset-4 hover:text-white transition-colors"
                >
                  Terms of Service
                </a>
              </p>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs text-neutral-500 font-mono">
                AI-powered business operating system
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
