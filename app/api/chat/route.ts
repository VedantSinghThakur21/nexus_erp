import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';

const AI_SERVICE_URL = 'http://127.0.0.1:8001/chat';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    const cookieStore = await cookies();
    const headerStore = await headers();
    
    // 1. Get Context
    const tenantId = headerStore.get('x-tenant-id') || cookieStore.get('tenant_id')?.value || 'master';
    const userEmail = cookieStore.get('user_id')?.value || 'Guest';

    // 2. Get Dynamic Keys (The "Keys to the Castle")
    const apiKey = cookieStore.get('tenant_api_key')?.value;
    const apiSecret = cookieStore.get('tenant_api_secret')?.value;

    if (!apiKey || !apiSecret) {
         // Fallback to Master keys ONLY if we are actually on the master site
         if (tenantId !== 'master') {
             return NextResponse.json({ error: "Authentication missing. Please log in again." }, { status: 401 });
         }
    }

    // 3. Send to Python
    const response = await fetch(AI_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      return NextResponse.json({ error: "AI Service Error" }, { status: 500 });
    }

    return new Response(response.body, {
      headers: { 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}