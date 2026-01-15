import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { frappeRequest } from '@/app/lib/api';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // 1. Check Payload
    const { messages } = await req.json();

    // 2. Check API Key
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        console.error("❌ MISSING API KEY: GOOGLE_GENERATIVE_AI_API_KEY");
        return new Response("Missing API Key. Check server logs.", { status: 500 });
    }

    // 3. Start Streaming - Temporarily disabled due to AI SDK compatibility issues
    return new Response(JSON.stringify({ 
        message: "AI chat functionality is temporarily disabled due to SDK compatibility issues. Please check back later." 
    }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Route Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
