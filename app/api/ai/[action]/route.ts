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
        let resultRaw = responseData?.data?.outputs;
        let resultStr = null;

        if (resultRaw) {
            // Find the property that holds the JSON string. Usually users map it to 'text', 'output', 'result', etc.
            if (typeof resultRaw === 'string') {
                resultStr = resultRaw;
            } else if (resultRaw.result && typeof resultRaw.result === 'string') {
                resultStr = resultRaw.result;
            } else if (resultRaw.text && typeof resultRaw.text === 'string') {
                resultStr = resultRaw.text;
            } else if (resultRaw.output && typeof resultRaw.output === 'string') {
                resultStr = resultRaw.output;
            } else {
                // Just grab the first string property available
                const stringKeys = Object.keys(resultRaw).filter(k => typeof resultRaw[k] === 'string');
                if (stringKeys.length > 0) {
                    resultStr = resultRaw[stringKeys[0]];
                } else if (Object.keys(resultRaw).length > 0) {
                    // It might already be a pure object map!
                    resultStr = resultRaw;
                }
            }
        } else if (responseData?.answer) {
             resultStr = responseData.answer;
        }

        let parsedResult = resultStr;
        
        try {
            if (typeof resultStr === 'string') {
                let cleanStr = resultStr.trim();
                
                // Try to extract JSON from markdown block
                const jsonMatch = cleanStr.match(/```json\s*([\s\S]*?)\s*```/);
                const genericMatch = cleanStr.match(/```\s*(\{[\s\S]*?\})\s*```/);
                
                if (jsonMatch && jsonMatch[1]) {
                    cleanStr = jsonMatch[1].trim();
                } else if (genericMatch && genericMatch[1]) {
                    cleanStr = genericMatch[1].trim();
                } else {
                    // Fallback to extracting the first '{' to the last '}'
                    const firstBrace = cleanStr.indexOf('{');
                    const lastBrace = cleanStr.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                        cleanStr = cleanStr.substring(firstBrace, lastBrace + 1).trim();
                    }
                }
                
                if (cleanStr.startsWith('{') || cleanStr.startsWith('[')) {
                    parsedResult = JSON.parse(cleanStr);
                }
            }
        } catch (e) {
            console.warn("Failed to parse AI output as JSON:", resultStr);
            // Keep as string if parsing fails
        }

        return NextResponse.json({ result: parsedResult });

    } catch (error: any) {
        console.error(`AI Action Error [${action}]:`, error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
