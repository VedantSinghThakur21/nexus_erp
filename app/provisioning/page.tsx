'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle2, Rocket, Server, Database, ShieldCheck, Clock } from 'lucide-react'

// Realistic step labels matching what the provisioning service actually does
const STEPS = [
  { label: 'Validating request', icon: ShieldCheck, startPct: 0 },
  { label: 'Creating isolated database', icon: Database, startPct: 15 },
  { label: 'Installing ERPNext', icon: Server, startPct: 30 },
  { label: 'Configuring your workspace', icon: ShieldCheck, startPct: 70 },
  { label: 'Finalizing & activating', icon: Rocket, startPct: 88 },
]

// Provisioning typically takes 8-12 minutes (bench new-site ~3 min + install-app ~5 min)
const EXPECTED_DURATION_MS = 8 * 60 * 1000

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export default function ProvisioningPage() {
  const [jobId, setJobId] = useState<string | null>(null)
  const [subdomain, setSubdomain] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [phase, setPhase] = useState<'starting' | 'polling' | 'done' | 'error' | 'lost'>('starting')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)

  const startTimeRef = useRef<number>(Date.now())
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Progress derived from elapsed time (holds at 95% until done)
  const progress = phase === 'done'
    ? 100
    : Math.min(95, Math.round((elapsed * 1000 / EXPECTED_DURATION_MS) * 100))

  const currentStepIndex = phase === 'done'
    ? STEPS.length - 1
    : STEPS.reduce((acc, step, idx) => progress >= step.startPct ? idx : acc, 0)

  // ── Step 1: kick off provisioning when component mounts ──
  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const res = await fetch('/api/provision/start', { method: 'POST' })
        const data = await res.json()

        if (!res.ok || !data.jobId) {
          if (!cancelled) {
            setErrorMsg(data.error || 'Failed to start provisioning. Please try again.')
            setPhase('error')
          }
          return
        }

        if (!cancelled) {
          setJobId(data.jobId)
          setSubdomain(data.subdomain ?? null)
          setPhase('polling')
        }
      } catch {
        if (!cancelled) {
          setErrorMsg('Could not reach the server. Please check your connection and try again.')
          setPhase('error')
        }
      }
    }

    start()
    return () => { cancelled = true }
  }, [])

  // ── Step 2: poll status every 5 seconds once we have a jobId ──
  useEffect(() => {
    if (phase !== 'polling' || !jobId) return

    startTimeRef.current = Date.now()

    const tick = async () => {
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setElapsed(secs)

      try {
        const res = await fetch(`/api/provision/status?jobId=${encodeURIComponent(jobId)}`)
        const data = await res.json()

        if (res.status === 404) {
          // Server restarted — job state lost; provisioning may still be running
          setPhase('lost')
          setSubdomain(prev => prev ?? data.subdomain ?? null)
          if (pollTimerRef.current) clearInterval(pollTimerRef.current)
          return
        }

        if (!res.ok) {
          setErrorMsg(data.error || 'Unexpected error checking status.')
          setPhase('error')
          if (pollTimerRef.current) clearInterval(pollTimerRef.current)
          return
        }

        if (data.done) {
          if (data.success) {
            setElapsed(data.elapsed ?? secs)
            setRedirectUrl(data.redirectUrl)
            setPhase('done')
            if (pollTimerRef.current) clearInterval(pollTimerRef.current)

            // Auto-redirect after a short delay so the user sees the success state
            setTimeout(() => {
              window.location.href = data.redirectUrl
            }, 2500)
          } else {
            setErrorMsg(data.error || 'Provisioning failed. Please contact support.')
            setPhase('error')
            if (pollTimerRef.current) clearInterval(pollTimerRef.current)
          }
        }
        // else: still pending — keep polling
      } catch {
        // Network hiccup — keep polling; don't surface transient errors
      }
    }

    pollTimerRef.current = setInterval(tick, 5000)
    tick() // immediate first check

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [phase, jobId])

  const isActive = phase === 'starting' || phase === 'polling'
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-lg border-slate-800 bg-slate-900/50 backdrop-blur text-slate-200">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mb-4">
            {phase === 'done' ? (
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            ) : phase === 'error' ? (
              <div className="text-red-500 font-bold text-2xl">!</div>
            ) : phase === 'lost' ? (
              <Clock className="w-8 h-8 text-yellow-500" />
            ) : (
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            )}
          </div>

          <CardTitle className="text-2xl text-white">
            {phase === 'done' ? 'Workspace Ready!' :
             phase === 'error' ? 'Setup Failed' :
             phase === 'lost' ? 'Still Working…' :
             'Setting Up Your Workspace'}
          </CardTitle>

          <CardDescription className="text-slate-400">
            {phase === 'done' ? `Setup completed in ${formatElapsed(elapsed)}. Redirecting you now…` :
             phase === 'error' ? 'Something went wrong. See the details below.' :
             phase === 'lost' ? 'The server restarted while setting up your workspace.' :
             'This typically takes 5–10 minutes. Do not close this tab.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">

          {/* ── Error state ── */}
          {phase === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4 text-red-200 text-sm text-center">
                {errorMsg}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => window.location.href = '/signup'}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/login'}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  Go to Login
                </button>
              </div>
            </div>
          )}

          {/* ── Server-restart / job-lost state ── */}
          {phase === 'lost' && (
            <div className="space-y-4">
              <div className="bg-yellow-900/20 border border-yellow-900/50 rounded-lg p-4 text-yellow-200 text-sm space-y-2">
                <p>Your workspace is still being provisioned in the background — this typically takes up to 10 minutes.</p>
                {subdomain && (
                  <p>
                    Once ready, you can log in at{' '}
                    <strong>{subdomain}.{rootDomain}</strong>.
                    Check your email for confirmation.
                  </p>
                )}
              </div>
              {subdomain && (
                <button
                  onClick={() => window.location.href = `https://${subdomain}.${rootDomain}/login`}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  Try Logging In →
                </button>
              )}
            </div>
          )}

          {/* ── In-progress state ── */}
          {isActive && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  <span>Progress</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatElapsed(elapsed)}
                  </span>
                </div>
                <Progress
                  value={progress}
                  className="h-2 bg-slate-800"
                  indicatorClassName="bg-blue-600 transition-all duration-1000"
                />
                <p className="text-xs text-slate-500 text-right">{progress}% complete</p>
              </div>

              <div className="space-y-3">
                {STEPS.map((step, idx) => {
                  const Icon = step.icon
                  const isStepActive = idx === currentStepIndex
                  const isPast = idx < currentStepIndex

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-4 transition-all duration-300 ${
                        isStepActive || isPast ? 'opacity-100' : 'opacity-30'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
                        isPast
                          ? 'bg-green-500/20 border-green-500/50 text-green-500'
                          : isStepActive
                          ? 'bg-blue-600/20 border-blue-600/50 text-blue-500 animate-pulse'
                          : 'bg-slate-800 border-slate-700 text-slate-500'
                      }`}>
                        {isPast ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <p className={`text-sm font-medium ${isStepActive ? 'text-white' : 'text-slate-400'}`}>
                        {step.label}
                      </p>
                    </div>
                  )
                })}
              </div>

              <p className="text-xs text-slate-600 text-center">
                Powered by Frappe ERPNext — full ERP provisioning takes time.
              </p>
            </>
          )}

          {/* ── Success state ── */}
          {phase === 'done' && redirectUrl && (
            <button
              onClick={() => { window.location.href = redirectUrl }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Open My Workspace <Rocket className="w-4 h-4" />
            </button>
          )}

        </CardContent>
      </Card>
    </div>
  )
}
