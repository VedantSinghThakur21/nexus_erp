import type { APIRequestContext } from '@playwright/test'

export async function frappeProxy<T>(
  request: APIRequestContext,
  methodPath: string,
  {
    method = 'POST',
    body,
    query,
  }: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    body?: unknown
    query?: Record<string, string>
  } = {},
): Promise<{ status: number; data: T | null; text: string }> {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : ''
  const url = `/api/proxy/${methodPath}${qs}`

  const resp =
    method === 'GET'
      ? await request.get(url)
      : await request.fetch(url, {
          method,
          data: body ?? undefined,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
        })

  const text = await resp.text()
  let data: T | null = null
  try {
    data = JSON.parse(text) as T
  } catch {
    data = null
  }
  return { status: resp.status(), data, text }
}

