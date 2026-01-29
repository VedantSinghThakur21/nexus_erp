import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';

const AI_SERVICE_URL = 'http://127.0.0.1:8001/chat';

export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    const headerStore = await headers();
    const cookieStore = await cookies();
    
    const tenantId = headerStore.get('x-tenant-id') || cookieStore.get('tenant_id')?.value || 'master';
    const userEmail = cookieStore.get('user_id')?.value || 'Guest';
    const apiKey = cookieStore.get('tenant_api_key')?.value;
    const apiSecret = cookieStore.get('tenant_api_secret')?.value;

    const response = await fetch(AI_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        tenant_id: tenantId,
        user_email: userEmail,
        api_key: apiKey || process.env.ERP_API_KEY, 
        api_secret: apiSecret || process.env.ERP_API_SECRET
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "AI Service Unavailable" }, { status: 500 });
    }

    if (!response.body) {
        return NextResponse.json({ error: "Empty response" }, { status: 500 });
    }

    // Pass the stream directly (Raw Text Mode)
    // We do NOT wrap it in 0:"..." anymore.
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8', 
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (error) {
    console.error("Chat Proxy Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}