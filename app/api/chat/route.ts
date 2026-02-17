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

    // Create a transformer to convert Dify SSE to raw text stream
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        if (!response.body) {
          controller.close();
          return;
        }
        const reader = response.body.getReader();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

              const jsonStr = trimmedLine.slice(6);
              try {
                const data = JSON.parse(jsonStr);
                // Extract answer from 'message' or 'agent_message' events
                if (data.event === 'message' || data.event === 'agent_message') {
                  const text = data.answer;
                  if (text) {
                    controller.enqueue(encoder.encode(text));
                  }
                }
              } catch (e) {
                // Ignore parse errors for keep-alive or malformed lines
              }
            }
          }
        } catch (error) {
          console.error("Stream processing error:", error);
          controller.error(error);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
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