import { NextRequest, NextResponse } from 'next/server'

/**
 * OAuth Token Exchange API Route
 * Exchanges authorization code for access token
 * Server-side route to keep client_secret secure
 */

// OAuth configuration from environment variables
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID!
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET!
const OAUTH_AUTH_URL = process.env.OAUTH_AUTH_URL || 'http://auth.localhost:8080'
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/callback'
const OAUTH_TOKEN_ENDPOINT = '/api/method/frappe.integrations.oauth2.get_token'
const OAUTH_USERINFO_ENDPOINT = '/api/method/frappe.integrations.oauth2.openid_profile'

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      )
    }

    // 2. Validate environment variables
    if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET) {
      console.error('OAuth credentials not configured')
      return NextResponse.json(
        { error: 'OAuth not configured properly' },
        { status: 500 }
      )
    }

    // 3. Exchange code for token
    const tokenUrl = `${OAUTH_AUTH_URL}${OAUTH_TOKEN_ENDPOINT}`
    
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: OAUTH_REDIRECT_URI,
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
    })

    console.log('Exchanging code for token...', { tokenUrl, clientId: OAUTH_CLIENT_ID })

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: tokenParams.toString(),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorText,
      })
      
      return NextResponse.json(
        { 
          error: 'Failed to exchange authorization code',
          details: errorText,
        },
        { status: tokenResponse.status }
      )
    }

    const tokenData = await tokenResponse.json()

    // 4. Fetch user info using access token
    let userInfo = null
    if (tokenData.access_token) {
      try {
        const userInfoUrl = `${OAUTH_AUTH_URL}${OAUTH_USERINFO_ENDPOINT}`
        
        const userInfoResponse = await fetch(userInfoUrl, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/json',
          },
        })

        if (userInfoResponse.ok) {
          const userInfoData = await userInfoResponse.json()
          userInfo = userInfoData.message || userInfoData
        }
      } catch (err) {
        console.warn('Failed to fetch user info:', err)
        // Non-critical, continue without user info
      }
    }

    // 5. Return token data to client
    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      user_info: userInfo,
    })

  } catch (error) {
    console.error('Token exchange error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
