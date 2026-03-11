import { NextResponse } from 'next/server'

// Test endpoint disabled for production security
export async function POST() {
  return NextResponse.json({ error: 'Not available' }, { status: 404 })
}
