import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { messages, conversation_id, user } = await req.json();

    // Get the last user message
    const query = messages[messages.length - 1].content;

    // Call Dify API
    const response = await fetch(`${process.env.DIFY_API_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DIFY_CHAT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query: query,
        response_mode: 'streaming',
        conversation_id: conversation_id,
        user: user || 'nexus-user',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Dify API Error:", error);
      return NextResponse.json({ error: "Failed to connect to AI service" }, { status: response.status });
    }

    // Return the stream directly from Dify
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}