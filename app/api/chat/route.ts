import { google } from '@ai-sdk/google';
import { streamText, type LanguageModel } from 'ai';
import { allTools } from '@/app/lib/ai/tools';

export const maxDuration = 60; // Allow up to 60 seconds for multi-step actions

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    // Cast the google model to `LanguageModel` to satisfy TypeScript
    model: google('gemini-1.5-flash') as unknown as LanguageModel, // Fast, cheap, and good at tool calling
    messages,
    system: `
      You are Nexus, an advanced ERP AI Agent.
      
      **Your Goal:** Help the user manage their business by executing actions in the ERP system.
      
      **Context:**
      - Today's Date: ${new Date().toLocaleDateString()}
      - User Role: Administrator
      
      **Capabilities:**
      - **CRM:** Manage leads, check opportunities.
      - **Fleet:** Search for machines, check availability, get asset details.
      - **Finance:** Search invoices, create draft invoices.
      
      **Rules:**
      1. **Be Proactive:** If a user asks "Rent a crane", don't just say okay. Ask "Which customer?" or "For what dates?" then use the tools.
      2. **Chain Actions:** You can call multiple tools. For example, if asked to "Bill Acme for the crane", you should first 'search_invoices' to see if one exists, or 'create_draft_invoice' if not.
      3. **Confirmation:** Before performing destructive actions (like creating records), briefly confirm the details you are about to submit.
      4. **Formatting:** Format lists (like leads or machines) in clean Markdown tables or bullet points.
    `,
    tools: allTools, // <--- Injecting the registry we just built
    maxSteps: 5,     // <--- Enables Agentic Loop (Tool -> Result -> Tool -> Result)
  });

  // `StreamTextResult` exposes `toTextStreamResponse()` in this SDK.
  return result.toTextStreamResponse();
}