import { NextRequest, NextResponse } from 'next/server'
import { runAgenticChat } from '@/plugins/agentic-ai/orchestrator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { message?: string; mode?: 'chat' | 'plan' | 'act' }
  const message = String(body.message || '').trim()

  if (!message) {
    return NextResponse.json({ ok: false, error: 'Message is required' }, { status: 400 })
  }

  const result = await runAgenticChat({ message, mode: body.mode || 'chat' })
  if (!result.ok) {
    return NextResponse.json(result, { status: result.status || 500 })
  }

  return NextResponse.json(result)
}

