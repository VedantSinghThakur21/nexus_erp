"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"
import { loginUser } from "@/app/actions/user-auth"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [workspace, setWorkspace] = useState("")
  const [showWorkspaceField, setShowWorkspaceField] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "avariq.in"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await loginUser(
        email,
        password,
        workspace.trim() || undefined,
      )
      if (!result.success) {
        const msg = result.error || "Invalid credentials"
        if (msg.toLowerCase().includes("no workspace found")) {
          setShowWorkspaceField(true)
        }
        throw new Error(msg)
      }

      try { sessionStorage.removeItem('nexus_user_roles_cache') } catch {}

      if ("redirectUrl" in result && result.redirectUrl) {
        window.location.href = result.redirectUrl
        return
      }

      if ("dashboardUrl" in result && result.dashboardUrl) {
        window.location.href = result.dashboardUrl
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-neutral-200">
          Email or Username
        </Label>
        <Input
          id="email"
          type="text"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="h-10 bg-white/5 border-white/10 text-neutral-100 placeholder:text-neutral-500 focus-visible:border-orange-500 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-medium text-neutral-200">
            Password
          </Label>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="h-10 pr-10 bg-white/5 border-white/10 text-neutral-100 placeholder:text-neutral-500 focus-visible:border-orange-500 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {showWorkspaceField && (
        <div className="space-y-1.5">
          <Label htmlFor="workspace" className="text-sm font-medium text-neutral-200">
            Workspace
          </Label>
          <div className="flex items-center gap-0 rounded-md border border-white/10 bg-white/5 overflow-hidden focus-within:border-orange-500">
            <Input
              id="workspace"
              type="text"
              placeholder="dabed"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())}
              autoComplete="organization"
              className="h-10 border-0 bg-transparent text-neutral-100 placeholder:text-neutral-500 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
            />
            <span className="pr-3 text-sm text-neutral-500 whitespace-nowrap">.{rootDomain}</span>
          </div>
          <p className="text-xs text-neutral-500">
            Only needed if sign-in cannot find your workspace automatically.
          </p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-10 font-semibold bg-white text-black hover:bg-neutral-200"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      {!showWorkspaceField && (
        <button
          type="button"
          onClick={() => setShowWorkspaceField(true)}
          className="w-full text-center text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          Know your workspace URL? Enter it manually
        </button>
      )}
    </form>
  )
}
