import Link from 'next/link'
import { ArrowRight, CheckCircle2, Loader2, MailCheck, ShieldCheck, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function buildWorkspaceLabel(subdomain?: string) {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'avariq.in'

  if (!subdomain) {
    return `Your workspace is being prepared at ${rootDomain}`
  }

  return `${subdomain}.${rootDomain}`
}

export default function ProvisioningStatusPage({
  searchParams,
}: {
  searchParams?: { subdomain?: string }
}) {
  const workspaceLabel = buildWorkspaceLabel(searchParams?.subdomain)

  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),_transparent_28%),linear-gradient(180deg,_#0f172a_0%,_#111827_45%,_#f8fafc_100%)] px-6 py-10">
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div className="absolute left-10 top-10 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="absolute right-8 bottom-12 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-6 text-slate-50">
          <Badge variant="secondary" className="border-white/15 bg-background/10 px-3 py-1 text-foreground shadow-sm backdrop-blur">
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            Provisioning in progress
          </Badge>

          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Your workspace is being built.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-200/85 sm:text-lg">
              We’ve queued the workspace setup in the background. You do not need to stay on this page.
              When provisioning completes, you’ll receive a secure email link for the new workspace.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-background/8 p-4 backdrop-blur">
              <ShieldCheck className="mb-3 h-5 w-5 text-sky-300" />
              <p className="text-sm font-medium text-white">Pending record created</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">The master tenant record is registered before the worker runs.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/8 p-4 backdrop-blur">
              <Sparkles className="mb-3 h-5 w-5 text-amber-300" />
              <p className="text-sm font-medium text-white">Background provisioning</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">The Python worker is creating the site and installing the app stack.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/8 p-4 backdrop-blur">
              <MailCheck className="mb-3 h-5 w-5 text-emerald-300" />
              <p className="text-sm font-medium text-white">Secure email delivery</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">When the workspace is ready, you’ll get the login link by email.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" className="bg-sky-500 text-white hover:bg-sky-400">
              <Link href="/login">
                Go to login
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/15 bg-background/8 text-foreground hover:bg-background/12 hover:text-white">
              <Link href="/onboarding">Return to onboarding</Link>
            </Button>
          </div>
        </div>

        <Card className="w-full max-w-xl border-white/10 bg-slate-950/70 text-foreground shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
          <CardHeader className="space-y-3 border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/20">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white">Workspace setup running</CardTitle>
                <CardDescription className="text-slate-300">
                  {workspaceLabel}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="rounded-2xl border border-white/10 bg-background/5 p-5">
              <div className="mb-4 flex items-center justify-between text-sm text-slate-300">
                <span>Provisioning stages</span>
                <span className="font-medium text-foreground">Email notification pending</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-white">1. Registration complete</p>
                    <p className="text-sm leading-6 text-slate-300">Your Pending tenant record has already been stored in the master database.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/20">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div>
                    <p className="font-medium text-white">2. Site build in progress</p>
                    <p className="text-sm leading-6 text-slate-300">The provisioning worker is creating the isolated workspace and preparing credentials.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-200 ring-1 ring-white/10">
                    <MailCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-white">3. Secure email link</p>
                    <p className="text-sm leading-6 text-slate-300">As soon as the workspace is ready, we’ll send the login link to your inbox.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-50">
              If you close this tab, you can return later and sign in with the email link once provisioning finishes.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
