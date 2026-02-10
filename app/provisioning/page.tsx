'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { performProvisioning } from '@/app/actions/provision'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle2, Rocket, Server, Database, ShieldCheck } from 'lucide-react'

const STEPS = [
  { label: "Validating Request", icon: ShieldCheck },
  { label: "Creating Isolated Database", icon: Database },
  { label: "Deploying ERPNext Instance", icon: Server },
  { label: "Configuring Admin Access", icon: ShieldCheck },
  { label: "Finalizing Workspace", icon: Rocket }
]

export default function ProvisioningPage() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [status, setStatus] = useState('Initializing...')
  const [error, setError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function startProvisioning() {
      try {
        setStatus("Starting provisioning engine...")

        // Start the long-running process
        // We simulate progress steps while waiting for the promise to resolve
        const result = await performProvisioning()

        if (!isMounted) return

        if (result.success && result.redirectUrl) {
          setIsComplete(true)
          setProgress(100)
          setCurrentStepIndex(STEPS.length - 1)
          setStatus("Workspace Ready! Redirecting...")
          setRedirectUrl(result.redirectUrl)

          // Auto redirect after short delay
          setTimeout(() => {
            window.location.href = result.redirectUrl!
          }, 2000)
        } else {
          setError(result.error || "Provisioning failed. Please contact support.")
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "An unexpected network error occurred.")
      }
    }

    startProvisioning()

    return () => { isMounted = false }
  }, [])

  // Fake Progress Simulation to keep user engaged during the 30-60s wait
  useEffect(() => {
    if (isComplete || error) return

    const totalDuration = 60000 // 60 seconds expected
    const intervalTime = 500
    const stepsCount = STEPS.length

    // We want to advance steps every ~12 seconds roughly

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return 95 // Hold at 95 until actually done
        return prev + (100 / (totalDuration / intervalTime))
      })

      setCurrentStepIndex(prev => {
        // Determine step based on progress % (rough approximation)
        // 0-20% = Step 0
        // 20-40% = Step 1, etc
        const calculatedStep = Math.floor((progress / 100) * stepsCount)
        return Math.min(calculatedStep, stepsCount - 1)
      })
    }, intervalTime)

    return () => clearInterval(timer)
  }, [progress, isComplete, error])


  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-lg border-slate-800 bg-slate-900/50 backdrop-blur text-slate-200">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mb-4">
            {isComplete ? (
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            ) : error ? (
              <div className="text-red-500 font-bold text-2xl">!</div>
            ) : (
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            )}
          </div>
          <CardTitle className="text-2xl text-white">
            {error ? 'Setup Failed' : isComplete ? 'Workspace Ready!' : 'Setting up nexuserp'}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {error ? 'Please try again or contact support.' : 'This typically takes about 60 seconds. Please do not close this tab.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {error ? (
            <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4 text-red-200 text-sm text-center">
              {error}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-slate-800" indicatorClassName={isComplete ? "bg-green-500" : "bg-blue-600"} />
              </div>

              <div className="space-y-3">
                {STEPS.map((step, idx) => {
                  const Icon = step.icon
                  const isActive = idx === currentStepIndex
                  const isPast = idx < currentStepIndex || isComplete

                  return (
                    <div key={idx} className={`flex items-center gap-4 transition-all duration-300 ${isActive || isPast ? 'opacity-100' : 'opacity-40'}`}>
                      <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center border transition-colors
                                        ${isPast ? 'bg-green-500/20 border-green-500/50 text-green-500' :
                          isActive ? 'bg-blue-600/20 border-blue-600/50 text-blue-500 animate-pulse' :
                            'bg-slate-800 border-slate-700 text-slate-500'}
                                    `}>
                        {isPast ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-400'}`}>
                          {step.label}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {isComplete && redirectUrl && (
            <button
              onClick={() => window.location.href = redirectUrl}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Go to Workspace <Rocket className="w-4 h-4" />
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
