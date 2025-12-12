import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { frappeRequest } from '@/app/lib/api';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // 1. Check Payload
    const { messages } = await req.json();

    // 2. Check API Key
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        console.error("❌ MISSING API KEY: GOOGLE_GENERATIVE_AI_API_KEY");
        return new Response("Missing API Key. Check server logs.", { status: 500 });
    }

    // 3. Start Streaming
    const result = streamText({
        model: google('gemini-1.5-flash'),
        messages,
        system: `You are Nexus, an AI assistant for a business running on ERPNext. 
        You have access to real-time data via tools. 
        Always use tools to fetch data; do not guess.
        If a tool fails, explain the error clearly to the user.
        Format currency in USD/INR as appropriate.
        Be concise and professional.`,
        tools: {
        // Tool 1: Check Stats
        get_dashboard_stats: tool({
            description: 'Get total revenue and active lead count',
            parameters: z.object({}),
            execute: async () => {
            try {
                // Fetch Invoices
                const invoices = await frappeRequest('frappe.client.get_list', 'GET', {
                    doctype: 'Sales Invoice',
                    fields: '["grand_total"]',
                    limit_page_length: 100
                });
                
                // Calculate Revenue
                const revenue = invoices.reduce((sum: number, inv: any) => sum + inv.grand_total, 0);
                
                // Fetch Leads
                const leads = await frappeRequest('frappe.client.get_list', 'GET', {
                    doctype: 'Lead',
                    fields: '["name"]'
                });

                return {
                    revenue: revenue,
                    total_leads: leads.length,
                    status: "Success"
                };
            } catch (e: any) {
                console.error("Stats Tool Error:", e.message);
                return { error: `Failed to fetch stats: ${e.message}` };
            }
            },
        }),

        // Tool 2: Search Leads
        search_lead: tool({
            description: 'Search for a lead or customer by name or email',
            parameters: z.object({ query: z.string().describe('The name or email to search for') }),
            execute: async ({ query }) => {
            try {
                const leads = await frappeRequest('frappe.client.get_list', 'GET', {
                    doctype: 'Lead',
                    filters: `[["lead_name", "like", "%${query}%"]]`,
                    fields: '["name", "lead_name", "company_name", "email_id", "status"]'
                });
                return leads.length > 0 ? leads : "No leads found matching that name.";
            } catch (e: any) {
                console.error("Search Tool Error:", e.message);
                return { error: "Search failed. Please check ERP connection." };
            }
            },
        }),

        // Tool 3: Get Pending Tasks
        get_pending_tasks: tool({
            description: 'Get a list of open tasks from projects',
            parameters: z.object({}),
            execute: async () => {
            try {
                const tasks = await frappeRequest('frappe.client.get_list', 'GET', {
                    doctype: 'Task',
                    filters: '[["status", "=", "Open"]]',
                    fields: '["subject", "priority", "exp_end_date"]',
                    limit_page_length: 5
                });
                return tasks;
            } catch (e: any) {
                return { error: "Failed to fetch tasks." };
            }
            },
        }),
        },
    });

    return result.toDataStreamResponse();

  } catch (error: any) {
    console.error("Route Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
