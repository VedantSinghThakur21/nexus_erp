import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/_lib/auth';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ action: string }> }
) {
    const auth = await requireAuth();
    if (!auth.authenticated) return auth.response;

    const { action } = await params;

    try {
        const body = await req.json();
        const { inputs, user } = body;

        // Extract tenant for multi-tenancy
        const cookieStore = req.cookies;
        const tenantApiKey = cookieStore.get('tenant_api_key')?.value;
        const xFrappeSiteName = req.headers.get('x-frappe-site-name');
        
        let tenantIdentifier = 'nexus-system';
        if (tenantApiKey) {
            // we could decode it or just use the existence to know it's a tenant
            tenantIdentifier = 'tenant-api-user'; 
        } 
        if (xFrappeSiteName) {
            tenantIdentifier = xFrappeSiteName;
        }

        // Prefer explicit user > extracted tenant > fallback
        const difyUser = user || tenantIdentifier;

        let apiKey = '';

        // Select the correct API Key based on the action
        switch (action) {
            case 'risk-score':
                apiKey = process.env.DIFY_RISK_API_KEY || '';
                break;
            case 'forecast':
                apiKey = process.env.DIFY_FORECAST_API_KEY || '';
                break;
            case 'fraud-check':
                apiKey = process.env.DIFY_FRAUD_API_KEY || '';
                break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        if (!apiKey) {
            return NextResponse.json({ error: `API Key not configured for action: ${action}` }, { status: 500 });
        }

        // Call Dify API for Workflow apps
        const response = await fetch(`${process.env.DIFY_API_URL}/workflows/run`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: inputs || {},
                response_mode: 'blocking', // Wait for full answer
                user: difyUser,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Dify API Error [${action}]:`, errorText);
            
            return NextResponse.json({ error: "AI Service Error" }, { status: response.status });
        }

        const responseData = await response.json();

        // Extract the result from the workflow output
        // Dify workflows return data in: { data: { outputs: { result: ... } } }
        let result = responseData?.data?.outputs?.result || responseData?.data?.outputs || responseData?.answer;
        
        try {
            if (typeof result === 'string' && (result.trim().startsWith('{') || result.trim().startsWith('['))) {
                result = JSON.parse(result);
            }
        } catch (e) {
            // Keep as string if parsing fails
        }

        return NextResponse.json({ result });

    } catch (error: any) {
        console.error(`AI Action Error [${action}]:`, error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
