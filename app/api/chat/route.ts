import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';

// The URL of your internal Python Service
// Since Next.js runs on the host (PM2), we target the exposed Docker port 8001
const AI_SERVICE_URL = 'http://127.0.0.1:8001/chat';

export const maxDuration = 60; // Allow long-running agent tasks
export const dynamic = 'force-dynamic'; // Prevent static caching

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    const headerStore = await headers();
    const cookieStore = await cookies();
    
    // 1. Get Context
    const tenantId = headerStore.get('x-tenant-id') || cookieStore.get('tenant_id')?.value || 'master';
    const userEmail = cookieStore.get('user_id')?.value || 'Guest';

    const apiKey = cookieStore.get('tenant_api_key')?.value;
    const apiSecret = cookieStore.get('tenant_api_secret')?.value;

    // 2. Forward request to Python Microservice
    const response = await fetch(AI_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        tenant_id: tenantId,
        user_email: userEmail,
        // Pass credentials dynamically
        api_key: apiKey || process.env.ERP_API_KEY, 
        api_secret: apiSecret || process.env.ERP_API_SECRET
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Service Error:", errorText);
      return NextResponse.json({ error: "AI Service Unavailable" }, { status: 500 });
    }

    if (!response.body) {
        return NextResponse.json({ error: "Empty response from AI" }, { status: 500 });
    }

    // 3. Transform Raw Text Stream -> AI Data Stream Protocol
    // The Python service sends raw chunks ("Hello", " World").
    // The Vercel AI SDK expects format: 0:"Hello"\n0:" World"\n
    const reader = response.body.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            
            // Format as Data Stream Protocol (0 = Text part)
            // JSON.stringify safely escapes quotes/newlines
            if (chunk) {
                const protocolChunk = `0:${JSON.stringify(chunk)}\n`;
                controller.enqueue(encoder.encode(protocolChunk));
            }
          }
        } catch (err) {
          console.error("Stream Transform Error:", err);
          controller.error(err);
        } finally {
          controller.close();
        }
      }
    });

    // 4. Return the Protocol Stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8', 
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Critical for Nginx
        'x-vercel-ai-data-stream': 'v1' // Identify as stream protocol
      },
    });

  } catch (error) {
    console.error("Chat Proxy Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}