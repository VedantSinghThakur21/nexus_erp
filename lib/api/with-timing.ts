import { NextResponse } from 'next/server'

export function withTimingHeaders(response: NextResponse, started: number): NextResponse {
  const ms = Math.round(performance.now() - started)
  response.headers.set('X-Response-Time', `${ms}ms`)
  return response
}
