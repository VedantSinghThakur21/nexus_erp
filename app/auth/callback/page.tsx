'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * OAuth Callback Handler
 * Handles the redirect from Frappe OAuth provider
 * Exchanges authorization code for access token
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // 1. Get authorization code from URL
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const errorParam = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        // 2. Check for OAuth errors
        if (errorParam) {
          throw new Error(errorDescription || errorParam)
        }

        if (!code) {
          throw new Error('Authorization code not found in callback URL')
        }

        // 3. Verify state parameter (CSRF protection)
        const savedState = sessionStorage.getItem('oauth_state')
        if (state && savedState && state !== savedState) {
          throw new Error('Invalid state parameter - possible CSRF attack')
        }

        // 4. Exchange code for token
        const tokenResponse = await fetch('/api/auth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        })

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json()
          throw new Error(errorData.error || 'Failed to exchange code for token')
        }

        const tokenData = await tokenResponse.json()

        // 5. Store tokens securely
        localStorage.setItem('access_token', tokenData.access_token)
        
        if (tokenData.refresh_token) {
          localStorage.setItem('refresh_token', tokenData.refresh_token)
        }
        
        if (tokenData.expires_in) {
          const expiresAt = Date.now() + tokenData.expires_in * 1000
          localStorage.setItem('token_expires_at', expiresAt.toString())
        }

        // 6. Store user info if provided
        if (tokenData.user_info) {
          localStorage.setItem('user_info', JSON.stringify(tokenData.user_info))
        }

        // 7. Clean up state
        sessionStorage.removeItem('oauth_state')

        // 8. Redirect to dashboard or original destination
        const redirectTo = sessionStorage.getItem('auth_redirect') || '/dashboard'
        sessionStorage.removeItem('auth_redirect')
        
        router.push(redirectTo)
      } catch (err) {
        console.error('OAuth callback error:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
        setIsProcessing(false)
      }
    }

    handleCallback()
  }, [searchParams, router])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          
          <h1 className="mb-2 text-2xl font-bold text-center text-gray-900">
            Authentication Failed
          </h1>
          
          <p className="mb-6 text-center text-gray-600">
            {error}
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/login')}
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              Try Again
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-center mb-6">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
        
        <h1 className="mb-2 text-2xl font-bold text-center text-gray-900">
          Completing Authentication
        </h1>
        
        <p className="text-center text-gray-600">
          Please wait while we log you in...
        </p>
      </div>
    </div>
  )
}
