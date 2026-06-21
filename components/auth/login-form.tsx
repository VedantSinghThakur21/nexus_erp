"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { loginUser, requestPasswordReset } from "@/app/actions/user-auth"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [workspace, setWorkspace] = useState("")
  const [showWorkspaceField, setShowWorkspaceField] = useState(false)
  const [tenantChoices, setTenantChoices] = useState<
    { subdomain: string; label: string }[] | null
  >(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestGoogleSignIn, setSuggestGoogleSignIn] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const router = useRouter()

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "avariq.in"

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError(null)
    try {
      await signIn("google", { callbackUrl: "/auth/complete" })
    } catch {
      setError("Google sign-in failed. Please try again.")
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent, workspaceOverride?: string) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuggestGoogleSignIn(false)
    setResetMessage(null)
    setTenantChoices(null)
    try {
      const result = await loginUser(
        email,
        password,
        workspaceOverride || workspace.trim() || undefined,
      )
      if (!result.success) {
        if ("tenantChoices" in result && result.tenantChoices?.length) {
          setTenantChoices(result.tenantChoices)
          return
        }
        const msg = result.error || "Invalid credentials"
        if ("suggestGoogleSignIn" in result && result.suggestGoogleSignIn) {
          setSuggestGoogleSignIn(true)
        }
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

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setResetLoading(true)
    setResetMessage(null)
    setError(null)
    try {
      const result = await requestPasswordReset(email, workspace.trim() || undefined)
      if (!result.success) {
        setError(result.error)
        if (result.error.toLowerCase().includes("multiple workspaces")) {
          setShowWorkspaceField(true)
        }
        return
      }
      setResetMessage(result.message)
      setShowForgotPassword(false)
    } catch {
      setError("Unable to send reset email. Please try again.")
    } finally {
      setResetLoading(false)
    }
  }

  if (tenantChoices && tenantChoices.length > 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-neutral-300 text-center">
          Select your workspace to continue:
        </p>
        <div className="space-y-2">
          {tenantChoices.map((t) => (
            <Button
              key={t.subdomain}
              type="button"
              className="w-full justify-start h-10 bg-white/5 border border-white/10 text-neutral-100 hover:bg-white/10"
              disabled={loading}
              onClick={(e) => {
                setWorkspace(t.subdomain)
                void handleSubmit(e, t.subdomain)
              }}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <button
          type="button"
          className="w-full text-center text-xs text-neutral-500 hover:text-neutral-300"
          onClick={() => setTenantChoices(null)}
        >
          Back
        </button>
      </div>
    )
  }

  if (showForgotPassword) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-neutral-300 text-center">
          Enter your email and we&apos;ll send a password reset link.
        </p>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-email" className="text-sm font-medium text-neutral-200">
              Email
            </Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-10 bg-white/5 border-white/10 text-neutral-100 placeholder:text-neutral-500 focus-visible:border-orange-500 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {showWorkspaceField && (
            <div className="space-y-1.5">
              <Label htmlFor="reset-workspace" className="text-sm font-medium text-neutral-200">
                Workspace
              </Label>
              <div className="flex items-center gap-0 rounded-md border border-white/10 bg-white/5 overflow-hidden focus-within:border-orange-500">
                <Input
                  id="reset-workspace"
                  type="text"
                  placeholder="your-workspace"
                  value={workspace}
                  onChange={(e) => setWorkspace(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())}
                  className="h-10 border-0 bg-transparent text-neutral-100 placeholder:text-neutral-500 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
                />
                <span className="pr-3 text-sm text-neutral-500 whitespace-nowrap">.{rootDomain}</span>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-10 font-semibold bg-white text-black hover:bg-neutral-200"
            disabled={resetLoading}
          >
            {resetLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>

        <button
          type="button"
          className="w-full text-center text-xs text-neutral-500 hover:text-neutral-300"
          onClick={() => {
            setShowForgotPassword(false)
            setError(null)
          }}
        >
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="w-full h-10 border-white/10 bg-white/5 text-neutral-100 hover:bg-white/10"
        disabled={googleLoading || loading}
        onClick={() => void handleGoogleSignIn()}
      >
        {googleLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redirecting to Google…
          </>
        ) : (
          "Sign in with Google"
        )}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-transparent px-2 text-neutral-500">or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {resetMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2.5 text-sm text-green-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{resetMessage}</span>
          </div>
        )}

        {error && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-sm text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            {suggestGoogleSignIn && (
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 border-orange-500/40 bg-orange-500/10 text-orange-100 hover:bg-orange-500/20"
                disabled={googleLoading || loading}
                onClick={() => void handleGoogleSignIn()}
              >
                Sign in with Google instead
              </Button>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-neutral-200">
            Email
          </Label>
          <Input
            id="email"
            type="email"
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
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(true)
                setError(null)
                setSuggestGoogleSignIn(false)
              }}
              className="text-xs text-neutral-400 hover:text-neutral-200 underline underline-offset-4"
            >
              Forgot password?
            </button>
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
              Workspace <span className="text-neutral-500 font-normal">(optional)</span>
            </Label>
            <div className="flex items-center gap-0 rounded-md border border-white/10 bg-white/5 overflow-hidden focus-within:border-orange-500">
              <Input
                id="workspace"
                type="text"
                placeholder="your-workspace"
                value={workspace}
                onChange={(e) => setWorkspace(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())}
                autoComplete="organization"
                className="h-10 border-0 bg-transparent text-neutral-100 placeholder:text-neutral-500 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
              />
              <span className="pr-3 text-sm text-neutral-500 whitespace-nowrap">.{rootDomain}</span>
            </div>
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
            "Sign in with email"
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-neutral-500">
        Know your workspace URL?{" "}
        <a
          href={`https://${rootDomain}/signup`}
          className="underline underline-offset-4 hover:text-neutral-300"
        >
          Create a workspace
        </a>
        {" · "}
        <button
          type="button"
          onClick={() => setShowWorkspaceField(true)}
          className="underline underline-offset-4 hover:text-neutral-300"
        >
          Enter workspace manually
        </button>
      </p>
    </div>
  )
}
