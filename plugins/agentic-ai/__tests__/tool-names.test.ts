import { describe, expect, it } from 'vitest'
import { fromApiToolName, MCP_TOOL_API_ALIASES, toApiToolName } from '../model/tool-names'

describe('MCP tool API aliases', () => {
  it('maps every canonical tool to a short api name (max 6 chars, no dots)', () => {
    for (const [canonical, api] of Object.entries(MCP_TOOL_API_ALIASES)) {
      expect(api.length).toBeLessThanOrEqual(6)
      expect(api).toMatch(/^[a-zA-Z0-9_-]+$/)
      expect(api).not.toContain('.')
      expect(toApiToolName(canonical)).toBe(api)
      expect(fromApiToolName(api)).toBe(canonical)
    }
  })

  it('round-trips crm.search_leads', () => {
    expect(toApiToolName('crm.search_leads')).toBe('srchld')
    expect(fromApiToolName('srchld')).toBe('crm.search_leads')
  })
})
