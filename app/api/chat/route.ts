import { StreamingTextResponse } from 'ai'

// This should match your Python backend URL
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const { messages, tenant_id } = await req.json()

    // FIX: Get the last user message
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'user') {
      return new Response('No user message found', { status: 400 })
    }

    // FIX: Format the user input with tenant context as required by the enhanced agent
    const formattedInput = formatUserInputWithContext(
      lastMessage.content,
      tenant_id || 'TENANT-001' // Default tenant if not provided
    )

    console.log('Sending to Python backend:', {
      url: `${PYTHON_BACKEND_URL}/chat`,
      tenant_id,
      message_preview: lastMessage.content.substring(0, 100)
    })

    // Call your Python FastAPI backend
    const response = await fetch(`${PYTHON_BACKEND_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: formattedInput, // Send formatted input with context
        tenant_id: tenant_id || 'TENANT-001',
        // Include conversation history if your backend supports it
        history: messages.slice(0, -1).map((m: any) => ({
          role: m.role,
          content: m.content
        }))
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Python backend error:', errorText)
      return new Response(`Backend error: ${errorText}`, { status: response.status })
    }

    // FIX: Check if the backend is streaming or returning JSON
    const contentType = response.headers.get('content-type')
    
    if (contentType?.includes('text/event-stream') || contentType?.includes('text/plain')) {
      // Streaming response
      return new StreamingTextResponse(response.body!)
    } else {
      // JSON response - extract the message and stream it
      const data = await response.json()
      const message = data.response || data.message || data.output || 'No response from agent'
      
      // Convert to stream
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(message))
          controller.close()
        }
      })
      
      return new StreamingTextResponse(stream)
    }

  } catch (error) {
    console.error('API Route Error:', error)
    return new Response(
      `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    )
  }
}

/**
 * Format user input with tenant context as required by the enhanced agent
 * This matches the Python format_user_input_with_context() function
 */
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