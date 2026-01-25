import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';

// The URL of your internal Python Service
const AI_SERVICE_URL = 'http://127.0.0.1:8001/chat';

export const maxDuration = 60; // Allow long-running agent tasks

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    // Get Tenant Context from Headers/Cookies to pass to AI
    const headerStore = await headers();
    const cookieStore = await cookies();
    
    const tenantId = headerStore.get('x-tenant-id') || cookieStore.get('tenant_id')?.value || 'master';
    const userEmail = cookieStore.get('user_id')?.value || 'Guest';

    // Forward request to Python Microservice
    const response = await fetch(AI_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        tenant_id: tenantId,
        user_email: userEmail
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Service Error:", errorText);
      return NextResponse.json({ error: "AI Service Unavailable" }, { status: 500 });
    }

    // Stream the response directly back to the client
    // The Python service must return a streaming response (Server-Sent Events)
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Chat Proxy Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}