import { NextRequest, NextResponse } from 'next/server'
import { convertLeadToOpportunity } from '@/app/actions/crm'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { leadId } = await req.json()

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    console.log('[API] Testing conversion for Lead:', leadId)
    const result = await convertLeadToOpportunity(leadId, false)
    
    console.log('[API] Conversion result:', JSON.stringify(result, null, 2))
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
