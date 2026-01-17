'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function ProvisioningContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenant = searchParams.get('tenant')
  const email = searchParams.get('email')
  
  const [status, setStatus] = useState<'provisioning' | 'checking' | 'ready' | 'error'>('provisioning')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('Initializing your workspace...')
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!tenant || !email) {
      router.push('/signup')
      return
    }

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 5
      })
    }, 1000)

    // Elapsed time counter
    const timeInterval = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)

    // Status messages
    const messageSteps = [
      { time: 0, message: 'Creating your separate database...' },
      { time: 15, message: 'Setting up ERPNext instance...' },
      { time: 45, message: 'Installing applications...' },
      { time: 90, message: 'Configuring user permissions...' },
      { time: 120, message: 'Finalizing workspace...' },
    ]

    const messageInterval = setInterval(() => {
      const currentStep = messageSteps
        .reverse()
        .find(step => elapsed >= step.time)
      
      if (currentStep) {
        setMessage(currentStep.message)
      }
    }, 1000)

    // Check site status every 10 seconds
    const checkInterval = setInterval(async () => {
      try {
        setStatus('checking')
        
        // Check provisioning status via API
        const response = await fetch(`/api/provisioning-status?tenant=${tenant}`, {
          method: 'GET',
        })

        if (response.ok) {
          const data = await response.json()
          
          if (data.ready) {
            setStatus('ready')
            setProgress(100)
            setMessage('Workspace ready! Redirecting...')
            
            clearInterval(progressInterval)
            clearInterval(checkInterval)
            clearInterval(messageInterval)
            clearInterval(timeInterval)
            
            // Redirect to tenant subdomain
            setTimeout(() => {
              const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
              const baseHost = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'localhost:3000'
              window.location.href = `${protocol}://${tenant}.${baseHost}/login`
            }, 2000)
          } else {
            setStatus('provisioning')
            // Update message based on API response
            if (data.message) {
              setMessage(data.message)
            }
          }
        } else {
          setStatus('provisioning')
        }
      } catch (error) {
        console.error('Status check failed:', error)
        setStatus('provisioning')
      }
    }, 10000) // Check every 10 seconds

    // Timeout after 5 minutes
    const timeout = setTimeout(() => {
      setStatus('error')
      setMessage('Provisioning is taking longer than expected. Please contact support.')
      clearInterval(progressInterval)
      clearInterval(checkInterval)
      clearInterval(messageInterval)
      clearInterval(timeInterval)
    }, 300000) // 5 minutes

    return () => {
      clearInterval(progressInterval)
      clearInterval(checkInterval)
      clearInterval(messageInterval)
      clearInterval(timeInterval)
      clearTimeout(timeout)
    }
  }, [tenant, email, router, elapsed])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            {status === 'error' ? '⚠️ Provisioning Delayed' : '🚀 Setting Up Your Workspace'}
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            {status === 'error' 
              ? 'There seems to be a delay in provisioning'
              : 'Please wait while we create your dedicated ERPNext instance'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          {status !== 'error' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{message}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                >
                  <div className="h-full w-full animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {/* Status Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Tenant:</span>
              <span className="text-sm text-gray-900 font-mono">{tenant}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Email:</span>
              <span className="text-sm text-gray-900">{email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Elapsed Time:</span>
              <span className="text-sm text-gray-900 font-mono">{formatTime(elapsed)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <span className={`text-sm font-semibold ${
                status === 'ready' ? 'text-green-600' :
                status === 'error' ? 'text-red-600' :
                status === 'checking' ? 'text-yellow-600' :
                'text-blue-600'
              }`}>
                {status === 'ready' ? '✅ Ready' :
                 status === 'error' ? '⚠️ Delayed' :
                 status === 'checking' ? '🔍 Checking...' :
                 '⏳ Provisioning'}
              </span>
            </div>
          </div>

          {/* Estimated Time */}
          {status === 'provisioning' && (
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                This process typically takes <strong>2-3 minutes</strong>
              </p>
              <p className="text-xs text-gray-500">
                We're creating a dedicated database, installing ERPNext, and configuring your workspace
              </p>
            </div>
          )}

          {/* Error Actions */}
          {status === 'error' && (
            <div className="space-y-3 pt-4 border-t">
              <p className="text-sm text-gray-700 text-center">
                Your workspace is still being provisioned in the background. You can:
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Check Again
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Try Login
                </button>
              </div>
            </div>
          )}

          {/* Loading Animation */}
          {status === 'provisioning' && (
            <div className="flex justify-center">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ProvisioningPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">🚀 Setting Up Your Workspace</CardTitle>
            <CardDescription className="text-lg mt-2">
              Please wait while we create your dedicated ERPNext instance
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <ProvisioningContent />
    </Suspense>
  )
}
