'use server'

import { cookies } from 'next/headers'

export async function login(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // 1. Prepare the request to ERPNext
  // We use the internal Docker URL (http://127.0.0.1:8080) for speed and security
  const erpUrl = process.env.ERP_NEXT_URL
  
  if (!erpUrl) {
    return { error: 'ERP URL is not configured' }
  }

  try {
    // 2. POST credentials to Frappe's login endpoint
    const response = await fetch(`${erpUrl}/api/method/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      // ERPNext specifically expects 'usr' and 'pwd' keys
      body: new URLSearchParams({
        usr: email,
        pwd: password,
      }),
    })

    const data = await response.json()

    // 3. Check for success
    if (response.ok && data.message === 'Logged In') {
      // 4. Extract the 'sid' (Session ID) cookie from ERPNext response
      const setCookieHeader = response.headers.get('set-cookie')
      
      if (setCookieHeader) {
        // Parse the sid from the raw header string
        const sidMatch = setCookieHeader.match(/sid=([^;]+)/)
        const sid = sidMatch ? sidMatch[1] : null

        if (sid) {
            // 5. Set the cookie in Next.js browser context
            const cookieStore = await cookies()
            cookieStore.set('sid', sid, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
          })
        }
      }

      return { success: true }
    } else {
      return { error: data.message || 'Invalid credentials' }
    }
  } catch (error) {
    console.error('Login error:', error)
    return { error: 'Failed to connect to ERP server' }
  }
}
