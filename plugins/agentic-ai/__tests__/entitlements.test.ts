import { describe, expect, it } from 'vitest'
import { evaluateAgenticEntitlement } from '../entitlements'
import type { AgenticTenantContext } from '../types'

function ctx(partial: Partial<AgenticTenantContext>): AgenticTenantContext {
  return {
    tenantId: 'acme',
    siteName: 'acme.avariq.in',
    plan: 'free',
    flags: {},
    ...partial,
  }
}

describe('evaluateAgenticEntitlement', () => {
  it('free tenant is denied with plan message', () => {
    const result = evaluateAgenticEntitlement(ctx({ plan: 'free', flags: { agentic_ai_enabled: true } }))
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/Pro|Enterprise/i)
  })

  it('pro without flag is denied', () => {
    const result = evaluateAgenticEntitlement(ctx({ plan: 'pro', flags: { agentic_ai_enabled: false } }))
    expect(result.allowed).toBe(false)
  })

  it('pro with flag is allowed', () => {
    const result = evaluateAgenticEntitlement(ctx({ plan: 'pro', flags: { agentic_ai_enabled: true } }))
    expect(result.allowed).toBe(true)
  })
})
