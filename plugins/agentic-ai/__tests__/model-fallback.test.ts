import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { runWithModel } from '../model/openrouter'

describe('runWithModel fallback', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key'
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('retries once on 500 then succeeds', async () => {
    let calls = 0
    globalThis.fetch = vi.fn(async (_input, init) => {
      calls += 1
      const body = JSON.parse(String(init?.body)) as { max_tokens?: number }
      if (calls === 1) {
        return new Response('err', { status: 500 })
      }
      expect(body.max_tokens).toBe(2048)
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 1, completion_tokens: 2 },
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const result = await runWithModel({
      plan: 'pro',
      messages: [{ role: 'user', content: 'hi' }],
      tools: [],
      systemPrompt: 'test',
      tenantId: 't1',
    })

    expect(calls).toBe(2)
    expect(result.stopReason).toBe('stop')
  })

  it('throws MODEL_UNAVAILABLE when both attempts fail', async () => {
    globalThis.fetch = vi.fn(async () => new Response('down', { status: 503 })) as typeof fetch

    await expect(
      runWithModel({
        plan: 'pro',
        messages: [{ role: 'user', content: 'hi' }],
        tools: [],
        systemPrompt: 'test',
        tenantId: 't1',
      })
    ).rejects.toMatchObject({ code: 'MODEL_UNAVAILABLE' })
  })
})
