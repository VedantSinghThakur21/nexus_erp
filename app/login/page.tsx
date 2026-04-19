import { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"
import { UnicornBackground } from "@/components/unicorn-background"
import { ThemeToggle } from "@/components/ui/theme-toggle"

export const metadata: Metadata = {
  title: "Sign in - Nexus ERP",
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      <UnicornBackground projectId="bmaMERjX2VZDtPrh4Zwx" />

      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="absolute top-6 left-8 z-20 flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">N</span>
        </div>
        <span className="font-semibold text-foreground tracking-tight">Nexus ERP</span>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="glass rounded-2xl p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-2">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your workspace</p>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <a href="#" className="underline underline-offset-4 hover:text-foreground transition-colors">
              Terms of Service
            </a>
          </p>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground">AI-powered business operating system</span>
        </div>
      </div>
    </div>
  )
}
