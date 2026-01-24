import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { createLead, getLeads, updateLeadStatus, getOpportunities } from '@/app/actions/crm';
import { getFleet, getAsset } from '@/app/actions/fleet';
import { getInvoices, createInvoice } from '@/app/actions/invoices';

// --- CRM AGENT TOOLS ---
export const crmTools = {
  create_lead: tool({
    description: 'Create a new sales lead in the CRM.',
    inputSchema: zodSchema(z.object({
      first_name: z.string().describe('First Name of the lead'),
      last_name: z.string().optional().describe('Last Name of the lead'),
      company_name: z.string().optional().describe('Company or Organization Name'),
      email_id: z.string().email().optional().describe('Email Address'),
      mobile_no: z.string().optional().describe('Phone Number'),
      status: z.enum(['Lead', 'Open', 'Replied', 'Opportunity', 'Interested']).optional().describe('Initial Status')
    })),
    async execute(args, options) {
      // Implement your createLead logic here
      return { message: 'Lead created (mock)' };
    }
  }),
  search_leads: tool({
    description: 'Search for existing leads or list recent leads.',
    inputSchema: zodSchema(z.object({
      query: z.string().optional().describe('Search term (name or company)'),
      limit: z.number().optional().default(5).describe('Number of results to return')
    })),
    async execute(args, options) {
      // Implement your searchLeads logic here
      return [];
    }
  }),
  update_lead_status: tool({
    description: 'Update the status of a specific lead (e.g. mark as Interested or Converted).',
    inputSchema: zodSchema(z.object({
      lead_id: z.string().describe('The ID of the lead (e.g. LEAD-2024-001)'),
      status: z.string().describe('New Status')
    })),
    async execute(args, options) {
      // Implement your updateLeadStatus logic here
      return { message: 'Lead status updated (mock)' };
    }
  }),
  get_opportunities: tool({
    description: 'List current sales opportunities and their stages.',
    inputSchema: zodSchema(z.object({})),
    async execute(args, options) {
      // Implement your getOpportunities logic here
      return [];
    }
  })
};

// --- FLEET (OPERATIONS) AGENT TOOLS ---
export const fleetTools = {
  search_fleet: tool({
    description: 'Search for heavy equipment/machines in the fleet. Use this to check availability or find specific assets.',
    inputSchema: zodSchema(z.object({
      query: z.string().optional().describe('Search term (e.g., "Crane", "Excavator", or Serial No)'),
      status: z.enum(['Active', 'Maintenance', 'Issued', 'Scrapped']).optional().describe('Filter by status')
    })),
    async execute(args, options) {
      // Implement your searchFleet logic here
      return [];
    }
  }),
  get_asset_details: tool({
    description: 'Get detailed information about a specific machine/asset.',
    inputSchema: zodSchema(z.object({
      asset_id: z.string().describe('The Serial Number of the asset (e.g. CRANE-001)')
    })),
    async execute(args, options) {
      // Implement your getAssetDetails logic here
      return {};
    }
  })
};

// --- FINANCE AGENT TOOLS ---
export const financeTools = {
  search_invoices: tool({
    description: 'Search for sales invoices. Useful for checking payment status or finding past bills.',
    inputSchema: zodSchema(z.object({
      customer: z.string().optional().describe('Filter by Customer Name'),
      status: z.enum(['Paid', 'Unpaid', 'Overdue', 'Draft']).optional().describe('Filter by Payment Status')
    })),
    async execute(args, options) {
      // Implement your searchInvoices logic here
      return [];
    }
  }),
  create_draft_invoice: tool({
    description: 'Create a new Draft Invoice for a customer. Does not submit it.',
    inputSchema: zodSchema(z.object({
      customer: z.string().describe('Customer Name'),
      items: z.array(z.object({
        item_code: z.string(),
        qty: z.number(),
        rate: z.number()
      })).describe('List of items to bill')
    })),
    async execute(args, options) {
      // Implement your createDraftInvoice logic here
      return { message: 'Draft invoice created (mock)' };
    }
  })
};

// Export a combined registry for the Chat Route
export const allTools = { ...crmTools, ...fleetTools, ...financeTools };