import { describe, expect, it } from 'vitest'
import { formatToolResultForChat } from '../format-tool-result'

describe('formatToolResultForChat', () => {
  it('formats lead search results', () => {
    const text = formatToolResultForChat('crm.search_leads', {
      success: true,
      idempotencyKey: 'x',
      data: [{ lead_name: 'Acme', status: 'Lead', email_id: 'a@acme.com' }],
    })
    expect(text).toContain('Acme')
    expect(text).toContain('lead I found')
  })

  it('formats errors', () => {
    const text = formatToolResultForChat('crm.search_leads', {
      success: false,
      idempotencyKey: 'x',
      error: 'Unauthorized',
    })
    expect(text).toContain('Unauthorized')
  })
})
