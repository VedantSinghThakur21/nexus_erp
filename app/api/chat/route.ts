import { StreamingTextResponse } from 'ai'

const PYTHON_BACKEND_URL = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:8000'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const { messages, tenant_id } = await req.json()

    console.log('🔍 API Route - Received request:', {
      messagesCount: messages?.length,
      tenant_id,
      lastMessage: messages?.[messages.length - 1]?.content?.substring(0, 50)
    })

    if (!messages || messages.length === 0) {
      console.error('❌ No messages in request')
      return new Response('No messages provided', { status: 400 })
    }

    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'user') {
      console.error('❌ Last message is not from user')
      return new Response('Invalid message format', { status: 400 })
    }

    // Format with tenant context
    const formattedInput = formatUserInputWithContext(
      lastMessage.content,
      tenant_id || 'master'
    )

    console.log('📤 Sending to Python backend:', {
      url: `${PYTHON_BACKEND_URL}/chat`,
      tenant_id,
      formattedPreview: formattedInput.substring(0, 150)
    })

    // Call Python backend
    const response = await fetch(`${PYTHON_BACKEND_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/plain, text/event-stream, application/json'
      },
      body: JSON.stringify({
        message: formattedInput,
        tenant_id: tenant_id || 'master'
      }),
    })

    console.log('📥 Backend response status:', response.status)
    console.log('📥 Backend response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Backend error:', errorText)
      return new Response(
        `Backend error (${response.status}): ${errorText}`, 
        { status: response.status }
      )
    }

    if (!response.body) {
      console.error('❌ No response body from backend')
      return new Response('No response from backend', { status: 500 })
    }

    console.log('✅ Streaming response from backend')

    // CRITICAL: Return the stream directly without modification
    return new StreamingTextResponse(response.body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no'
      }
    })

  } catch (error) {
    console.error('❌ API Route Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      `API Route Error: ${errorMessage}`,
      { status: 500 }
    )
  }
}

function formatUserInputWithContext(
  userMessage: string,
  tenantId: string
): string {
  const timestamp = new Date().toISOString()
  
  return `Context:
- Current Tenant ID: ${tenantId}
- Timestamp: ${timestamp}

User Request:
${userMessage}`
}