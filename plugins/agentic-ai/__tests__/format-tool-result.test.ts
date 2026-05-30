import { describe, expect, it } from 'vitest'
import { buildToolChatPayload } from '../format-tool-result'

describe('buildToolChatPayload', () => {
  it('returns table display for leads', () => {
    const payload = buildToolChatPayload('crm.search_leads', {
      success: true,
      idempotencyKey: 'x',
      data: [{ name: 'L-1', lead_name: 'Acme', status: 'Open', email_id: 'a@acme.com' }],
    })
    expect(payload.display?.type).toBe('table')
    if (payload.display?.type === 'table') {
      expect(payload.display.title).toBe('Leads')
      expect(payload.display.rows).toHaveLength(1)
      expect(payload.display.exportable).toBe(true)
    }
  })

  it('returns info display for empty leads', () => {
    const payload = buildToolChatPayload('crm.search_leads', {
      success: true,
      idempotencyKey: 'x',
      data: [],
    })
    expect(payload.display?.type).toBe('info')
  })

  it('returns error display on failure', () => {
    const payload = buildToolChatPayload('crm.search_leads', {
      success: false,
      idempotencyKey: 'x',
      error: 'Unauthorized',
    })
    expect(payload.display?.type).toBe('error')
  })
})
