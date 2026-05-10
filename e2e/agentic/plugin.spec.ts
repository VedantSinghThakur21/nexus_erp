import { expect, test } from '@playwright/test'

test.describe('Agentic AI plugin workflow', () => {
  test('entitlement route returns plugin access decision', async ({ request }) => {
    const response = await request.get('/api/agentic/entitlement')
    expect(response.ok()).toBe(true)

    const data = await response.json()
    expect(typeof data.allowed).toBe('boolean')
    expect(data.plan).toBeTruthy()
    expect(data.flags).toBeTruthy()
  })

  test('workspace shows either locked state or chat workflow', async ({ page, request }) => {
    const entitlement = await (await request.get('/api/agentic/entitlement')).json()

    await page.goto('/agents')
    await page.waitForLoadState('domcontentloaded')

    if (!entitlement.allowed) {
      await expect(page.getByText(/upgrade or enable agentic ai/i)).toBeVisible()
      return
    }

    await expect(page.getByText(/avarIQ agent/i).first()).toBeVisible()
  })

  test('tool metadata keeps finance tools separately gated when plugin is enabled', async ({ request }) => {
    const response = await request.get('/api/agentic/entitlement')
    const data = await response.json()
    test.skip(!data.allowed, data.reason || 'Agentic AI is locked for this tenant')

    const invoiceTool = data.tools.find((tool: { name: string }) => tool.name === 'invoices.get_invoice')
    expect(invoiceTool).toBeTruthy()
    expect(invoiceTool.requiredFlag).toBe('agentic_finance_enabled')
  })

  test('chat endpoint is gated and returns a structured result when enabled', async ({ request }) => {
    const response = await request.post('/api/agentic/chat', {
      data: {
        message: 'What can the Agentic AI plugin help with?',
        mode: 'chat',
      },
    })

    const data = await response.json()
    if (response.status() === 403) {
      expect(data.error).toBeTruthy()
      return
    }

    expect(response.ok()).toBe(true)
    expect(data.ok).toBe(true)
    expect(data.result.answer).toBeTruthy()
    expect(Array.isArray(data.result.citations)).toBe(true)
  })
})

