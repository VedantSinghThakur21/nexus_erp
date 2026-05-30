import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/app/api/_lib/auth';
import {
    calculateLeadScore,
    calculateOpportunityProbability,
    type LeadScoreInput,
} from '@/lib/ai/crm-scoring';
import { buildCrmInsightsHeuristic } from '@/lib/ai/crm-pipeline-insights';
import { buildCatalogueInsights } from '@/lib/ai/catalogue-insights';
import { buildDifyInputs, getDifyApiUrl, resolveDifyApiKey } from '@/lib/ai/dify-config';

function heuristicResult(action: string, inputs: Record<string, unknown> | undefined) {
    const safeInputs = inputs || {};

    switch (action) {
        case 'lead-score': {
            const raw = safeInputs.leads_data;
            const leads: LeadScoreInput[] =
                typeof raw === 'string' ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
            return {
                scores: leads.map((l) => ({
                    name: l.name,
                    score: calculateLeadScore(l),
                })),
                source: 'heuristic',
            };
        }
        case 'opportunity-probability': {
            const raw = safeInputs.opportunity_data;
            const opp = typeof raw === 'string' ? JSON.parse(raw) : raw || {};
            const probability = calculateOpportunityProbability({
                sales_stage: opp.new_stage || opp.sales_stage,
                probability: opp.current_probability ?? opp.probability,
                opportunity_amount: opp.amount ?? opp.opportunity_amount,
                expected_closing: opp.expected_closing,
            });
            return { probability, source: 'heuristic' };
        }
        case 'crm-insights':
            return buildCrmInsightsHeuristic(safeInputs);
        case 'risk-score':
            return { risk_score: 35, risk_level: 'low', source: 'heuristic' };
        case 'fraud-check':
            return { fraud_risk: 'low', flags: [], source: 'heuristic' };
        case 'forecast': {
            const raw = safeInputs.catalogue_data ?? safeInputs.catalogue_summary;
            if (raw) {
                type CatalogueSummary = {
                    total?: number
                    available?: number
                    out_of_stock?: number
                    avg_rate?: number
                    top_category?: string
                }
                let parsed: { summary?: CatalogueSummary } & CatalogueSummary = {};
                try {
                    parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw as typeof parsed);
                } catch {
                    parsed = {};
                }
                const summary: CatalogueSummary = parsed.summary ?? parsed;
                const total = summary.total ?? 0;
                const available = summary.available ?? 0;
                const outOfStock = summary.out_of_stock ?? 0;
                const utilization = total > 0 ? Math.round((available / total) * 100) : 0;
                return {
                    forecast_growth_pct: Math.min(25, Math.max(0, utilization - outOfStock)),
                    confidence: 'medium',
                    executive_summary:
                        total > 0
                            ? `Catalogue has ${total} items with ${available} bookable (${utilization}% availability). ${outOfStock > 0 ? `${outOfStock} need restock.` : 'Inventory looks healthy.'}${summary.top_category ? ` Top category: ${summary.top_category}.` : ''}`
                            : 'Add catalogue items to generate occupancy forecasts.',
                    source: 'heuristic',
                };
            }
            return { forecast_growth_pct: 8, confidence: 'medium', source: 'heuristic' };
        }
        default:
            return null;
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ action: string }> }
) {
    const auth = await requireAuth();
    if (!auth.authenticated) return auth.response;

    const { action } = await params;

    const validActions = new Set([
        'risk-score',
        'forecast',
        'fraud-check',
        'crm-insights',
        'lead-score',
        'opportunity-probability',
    ]);
    if (!validActions.has(action)) {
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

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

        let apiKey = resolveDifyApiKey(action);
        const difyApiUrl = getDifyApiUrl();

        if (!apiKey) {
            const fallback = heuristicResult(action, inputs);
            if (fallback) {
                return NextResponse.json({ result: fallback });
            }
            return NextResponse.json({ error: `API Key not configured for action: ${action}` }, { status: 500 });
        }

        // Call Dify API for Workflow apps
        const response = await fetch(`${difyApiUrl}/workflows/run`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: buildDifyInputs(action, inputs),
                response_mode: 'blocking', // Wait for full answer
                user: difyUser,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Dify API Error [${action}]:`, errorText);

            const fallback = heuristicResult(action, inputs);
            if (fallback) {
                return NextResponse.json({ result: fallback });
            }

            return NextResponse.json({ error: "AI Service Error" }, { status: response.status });
        }

        const responseData = await response.json();

        // Extract the result from the workflow output
        const resultRaw = responseData?.data?.outputs;
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
        } catch {
            console.warn("Failed to parse AI output as JSON:", resultStr);
            // Keep as string if parsing fails
        }

        return NextResponse.json({ result: parsedResult });

    } catch (error: unknown) {
        console.error(`AI Action Error [${action}]:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
