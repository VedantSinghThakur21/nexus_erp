import { describe, expect, it } from 'vitest'
import { canUseAgenticTool } from '../entitlements'
import { getMcpTool } from '../mcp/registry'

describe('tool entitlements', () => {
  const proFinance = { plan: 'pro' as const, flags: { agentic_finance_enabled: false } }
  const proFinanceOn = { plan: 'pro' as const, flags: { agentic_finance_enabled: true } }

  it('blocks invoices.get_invoice without finance flag', () => {
    const tool = getMcpTool('invoices.get_invoice')!
    const gate = canUseAgenticTool(proFinance, tool.requiredPlan, tool.requiredFlag)
    expect(gate.allowed).toBe(false)
  })

  it('blocks invoices.create_invoice on pro even with flag', () => {
    const tool = getMcpTool('invoices.create_invoice')!
    const gate = canUseAgenticTool(proFinanceOn, tool.requiredPlan, tool.requiredFlag)
    expect(gate.allowed).toBe(false)
  })

  it('blocks payments.record_payment on pro', () => {
    const tool = getMcpTool('payments.record_payment')!
    const gate = canUseAgenticTool(proFinanceOn, tool.requiredPlan, tool.requiredFlag)
    expect(gate.allowed).toBe(false)
  })
})
