import { NextRequest, NextResponse } from 'next/server'
import { createAgenticRun } from '@/plugins/agentic-ai/orchestrator'
import type { MCPToolCall } from '@/plugins/agentic-ai/mcp/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { toolCall?: MCPToolCall; requestedBy?: string }

  if (!body.toolCall?.name || !body.toolCall.input) {
    return NextResponse.json({ ok: false, error: 'toolCall.name and toolCall.input are required' }, { status: 400 })
  }

  const result = await createAgenticRun({
    toolCall: body.toolCall,
    requestedBy: body.requestedBy,
  })

  return NextResponse.json(result, { status: result.ok ? 200 : result.status || 500 })
}

