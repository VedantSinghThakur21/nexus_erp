type FrappeMethod = 'GET' | 'POST'

export interface FrappeClientOptions {
  baseUrl?: string
  apiKey?: string
  apiSecret?: string
  siteName: string
}

interface FrappeResponse<T> {
  message?: T
  data?: T
}

export class AgentFrappeClient {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly apiSecret: string
  private readonly siteName: string

  constructor(options: FrappeClientOptions) {
    this.baseUrl = options.baseUrl || process.env.ERP_NEXT_URL || 'http://127.0.0.1:8080'
    this.apiKey = options.apiKey || process.env.AGENT_FRAPPE_API_KEY || process.env.ERP_API_KEY || ''
    this.apiSecret = options.apiSecret || process.env.AGENT_FRAPPE_API_SECRET || process.env.ERP_API_SECRET || ''
    this.siteName = options.siteName

    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Missing AGENT_FRAPPE_API_KEY/SECRET or ERP_API_KEY/SECRET')
    }
  }

  async call<T = unknown>(endpoint: string, method: FrappeMethod, payload?: Record<string, unknown>): Promise<T> {
    const url = new URL(`${this.baseUrl}/api/method/${endpoint}`)

    if (method === 'GET' && payload) {
      for (const [key, value] of Object.entries(payload)) {
        if (value === undefined || value === null) continue
        url.searchParams.set(key, typeof value === 'string' ? value : JSON.stringify(value))
      }
    }

    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Authorization': `token ${this.apiKey}:${this.apiSecret}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Frappe-Site-Name': this.siteName,
      },
      body: method === 'POST' ? JSON.stringify(payload || {}) : undefined,
      cache: 'no-store',
    })

    const data = (await response.json()) as FrappeResponse<T> & { message?: string }

    if (!response.ok) {
      const message = typeof data?.message === 'string'
        ? data.message
        : `Frappe request failed with status ${response.status}`
      throw new Error(message)
    }

    return (data.message ?? data.data ?? data) as T
  }

  getList<T = unknown>(doctype: string, args: Record<string, unknown> = {}) {
    return this.call<T[]>('frappe.client.get_list', 'GET', {
      doctype,
      ...args,
    })
  }

  getDoc<T = unknown>(doctype: string, name: string) {
    return this.call<T>('frappe.client.get', 'GET', {
      doctype,
      name,
    })
  }

  insertDoc<T = unknown>(doc: Record<string, unknown>) {
    return this.call<T>('frappe.client.insert', 'POST', { doc })
  }

  setValue<T = unknown>(doctype: string, name: string, fieldname: Record<string, unknown>) {
    return this.call<T>('frappe.client.set_value', 'POST', {
      doctype,
      name,
      fieldname,
    })
  }
}
