import { NextResponse } from 'next/server'

export const AGENTIC_VERSION = '2'

export function withAgenticHeaders<T extends NextResponse>(response: T): T {
  response.headers.set('X-Agentic-Version', AGENTIC_VERSION)
  return response
}
