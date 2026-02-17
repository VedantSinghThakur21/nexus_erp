import { NextRequest, NextResponse } from 'next/server';

/**
 * Generic AI Action Router
 * Routes requests to specific Dify Workflow/Completion Apps based on the 'action' parameter.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ action: string }> }
) {
    const { action } = await params;

    try {
        const body = await req.json();
        const { inputs, user } = body;

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

        // Call Dify "Completion" API (for Text Generator / Workflow apps)
        // Note: Use /completion-messages for text-gen apps, or /workflows/run for workflow apps.
        // We assume 'Text Generator' apps for simplicity as per plan.
        const response = await fetch(`${process.env.DIFY_API_URL}/completion-messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: inputs || {}, // e.g. { "inspection_data": "..." }
                response_mode: 'blocking', // Wait for full answer
                user: user || 'nexus-system',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Dify API Error [${action}]:`, errorText);
            return NextResponse.json({ error: "AI Service Error" }, { status: response.status });
        }

        const data = await response.json();

        // Parse the inner JSON if the AI returned a JSON string inside the 'answer' field
        // Dify returns: { answer: "{\"risk_score\": ...}", ... }
        let result = data.answer;
        try {
            // Try to parse if it looks like JSON
            if (typeof result === 'string' && (result.trim().startsWith('{') || result.trim().startsWith('['))) {
                result = JSON.parse(result);
            }
        } catch (e) {
            // Keep as string if parsing fails
        }

        return NextResponse.json({ result });

    } catch (error: any) {
        console.error(`AI Action Error [${action}]:`, error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
