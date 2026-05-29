import { describe, expect, it } from 'vitest'
import {
  friendlyWriteBlockedMessage,
  mergeChatResponse,
  sanitizeUserFacingResponse,
} from '../chat-response'

describe('chat-response', () => {
  it('sanitizes tool names', () => {
    expect(sanitizeUserFacingResponse('Use crm.create_lead in Plan or Act mode.')).not.toContain('crm.')
    expect(sanitizeUserFacingResponse('Use crm.create_lead in Plan or Act mode.')).not.toContain('Plan or Act')
  })

  it('replaces filler model text with data notes', () => {
    const out = mergeChatResponse('Okay, let me check for open leads.', [
      "I checked your CRM and didn't find any leads matching that.",
    ], [])
    expect(out).not.toMatch(/let me check/i)
    expect(out).toContain("didn't find any leads")
  })

  it('uses friendly write message', () => {
    expect(friendlyWriteBlockedMessage('crm.create_lead')).toContain('happy to add')
    expect(friendlyWriteBlockedMessage('crm.create_lead')).not.toContain('crm.')
  })
})
