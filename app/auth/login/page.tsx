'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * OAuth Login Initiation Page
 * Redirects user to Frappe OAuth authorization endpoint
 */

// Generate random state for CSRF protection
function generateRandomState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export default function OAuthLoginPage() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const expiresAt = localStorage.getItem('token_expires_at')
    
    if (token && expiresAt && parseInt(expiresAt) > Date.now()) {
      // User already has valid token, redirect to dashboard
      router.push('/dashboard')
    }
  }, [router])

  const initiateOAuthLogin = () => {
    try {
      setIsRedirecting(true)
      setError(null)

      // Get OAuth configuration from environment
      const clientId = process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID
      const authUrl = process.env.NEXT_PUBLIC_OAUTH_AUTH_URL || 'http://auth.localhost:8080'
      const redirectUri = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI || `${window.location.origin}/auth/callback`
      const authEndpoint = '/api/method/frappe.integrations.oauth2.authorize'

      if (!clientId) {
        throw new Error('OAuth client ID not configured')
      }

      // Generate and store state for CSRF protection
      const state = generateRandomState()
      sessionStorage.setItem('oauth_state', state)

      // Store intended destination (for post-login redirect)
      const searchParams = new URLSearchParams(window.location.search)
      const redirectTo = searchParams.get('redirect') || '/dashboard'
      sessionStorage.setItem('auth_redirect', redirectTo)

      // Build authorization URL
      const authorizationUrl = new URL(`${authUrl}${authEndpoint}`)
      authorizationUrl.searchParams.set('client_id', clientId)
      authorizationUrl.searchParams.set('redirect_uri', redirectUri)
      authorizationUrl.searchParams.set('response_type', 'code')
      authorizationUrl.searchParams.set('scope', 'openid email profile all')
      authorizationUrl.searchParams.set('state', state)

      // Redirect to OAuth provider
      window.location.href = authorizationUrl.toString()
    } catch (err) {
      console.error('OAuth initiation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to initiate login')
      setIsRedirecting(false)
    }
  }

  const handleLogout = () => {
    // Clear all stored tokens
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('token_expires_at')
    localStorage.removeItem('user_info')
    sessionStorage.clear()
    
    // Reload page
    router.refresh()
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        {/* Logo/Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-blue-600 rounded-full">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="mt-2 text-gray-600">
            Sign in to your tenant account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-red-600 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="ml-3 text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Login Button */}
        <button
          onClick={initiateOAuthLogin}
          disabled={isRedirecting}
          className="w-full px-6 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-lg"
        >
          {isRedirecting ? (
            <span className="flex items-center justify-center">
              <svg
                className="w-5 h-5 mr-3 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Redirecting...
            </span>
          ) : (
            'Sign in with OAuth'
          )}
        </button>

        {/* Info Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            You will be redirected to the authentication server
          </p>
        </div>

        {/* Development Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Development Info
            </h3>
            <div className="space-y-1 text-xs text-gray-600">
              <p>
                <strong>Auth URL:</strong>{' '}
                {process.env.NEXT_PUBLIC_OAUTH_AUTH_URL || 'http://auth.localhost:8080'}
              </p>
              <p>
                <strong>Client ID:</strong>{' '}
                {process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID || 'Not configured'}
              </p>
              <p>
                <strong>Redirect URI:</strong>{' '}
                {process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI ||
                  `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
              </p>
            </div>
            
            {typeof window !== 'undefined' && localStorage.getItem('access_token') && (
              <button
                onClick={handleLogout}
                className="mt-3 w-full px-4 py-2 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 transition"
              >
                Clear Stored Tokens
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
