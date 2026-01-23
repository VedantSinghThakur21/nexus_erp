import { tool } from 'ai';
import { z } from 'zod';
import { createLead, getLeads, updateLeadStatus, getOpportunities } from '@/app/actions/crm';
import { getFleet, getAsset } from '@/app/actions/fleet';
import { getInvoices, createInvoice } from '@/app/actions/invoices';

// --- CRM AGENT TOOLS ---
export const crmTools = {
  create_lead: tool(
    'create_lead',
    z.object({
      first_name: z.string().describe('First Name of the lead'),
      last_name: z.string().optional().describe('Last Name of the lead'),
      company_name: z.string().optional().describe('Company or Organization Name'),
      email_id: z.string().email().optional().describe('Email Address'),
      mobile_no: z.string().optional().describe('Phone Number'),
      status: z.enum(['Lead', 'Open', 'Replied', 'Opportunity', 'Interested']).optional().describe('Initial Status')
    }),
    z.object({ message: z.string() }).or(z.object({ error: z.string() })),
    'Create a new sales lead in the CRM.'
  ),
  search_leads: tool(
    'search_leads',
    z.object({
      query: z.string().optional().describe('Search term (name or company)'),
      limit: z.number().optional().default(5).describe('Number of results to return')
    }),
    z.array(z.any()),
    'Search for existing leads or list recent leads.'
  ),
  update_lead_status: tool(
    'update_lead_status',
    z.object({
      lead_id: z.string().describe('The ID of the lead (e.g. LEAD-2024-001)'),
      status: z.string().describe('New Status')
    }),
    z.object({ message: z.string() }).or(z.object({ error: z.string() })),
    'Update the status of a specific lead (e.g. mark as Interested or Converted).'
  ),
  get_opportunities: tool(
    'get_opportunities',
    z.object({}),
    z.array(z.any()),
    'List current sales opportunities and their stages.'
  )
};

// --- FLEET (OPERATIONS) AGENT TOOLS ---
export const fleetTools = {
  search_fleet: tool(
    'search_fleet',
    z.object({
      query: z.string().optional().describe('Search term (e.g., "Crane", "Excavator", or Serial No)'),
      status: z.enum(['Active', 'Maintenance', 'Issued', 'Scrapped']).optional().describe('Filter by status')
    }),
    z.array(z.any()),
    'Search for heavy equipment/machines in the fleet. Use this to check availability or find specific assets.'
  ),
  get_asset_details: tool(
    'get_asset_details',
    z.object({
      asset_id: z.string().describe('The Serial Number of the asset (e.g. CRANE-001)')
    }),
    z.any(),
    'Get detailed information about a specific machine/asset.'
  )
};

// --- FINANCE AGENT TOOLS ---
export const financeTools = {
  search_invoices: tool(
    'search_invoices',
    z.object({
      customer: z.string().optional().describe('Filter by Customer Name'),
      status: z.enum(['Paid', 'Unpaid', 'Overdue', 'Draft']).optional().describe('Filter by Payment Status')
    }),
    z.array(z.any()),
    'Search for sales invoices. Useful for checking payment status or finding past bills.'
  ),
  create_draft_invoice: tool(
    'create_draft_invoice',
    z.object({
      customer: z.string().describe('Customer Name'),
      items: z.array(z.object({
        item_code: z.string(),
        qty: z.number(),
        rate: z.number()
      })).describe('List of items to bill')
    }),
    z.object({ message: z.string() }).or(z.object({ error: z.string() })),
    'Create a new Draft Invoice for a customer. Does not submit it.'
  )
};

// Export a combined registry for the Chat Route
export const allTools = { ...crmTools, ...fleetTools, ...financeTools };
      update_lead_status: tool(
        'update_lead_status',
        z.object({
          lead_id: z.string().describe('The ID of the lead (e.g. LEAD-2024-001)'),
          status: z.string().describe('New Status')
        }),
        z.object({ message: z.string() }).or(z.object({ error: z.string() })),
        'Update the status of a specific lead (e.g. mark as Interested or Converted).'
      ),
      get_opportunities: tool(
        'get_opportunities',
        z.object({}),
        z.array(z.any()),
        'List current sales opportunities and their stages.'
      )
    };

    // --- FLEET (OPERATIONS) AGENT TOOLS ---
    export const fleetTools = {
      search_fleet: tool(
        'search_fleet',
        z.object({
          query: z.string().optional().describe('Search term (e.g., "Crane", "Excavator", or Serial No)'),
          status: z.enum(['Active', 'Maintenance', 'Issued', 'Scrapped']).optional().describe('Filter by status')
        }),
        z.array(z.any()),
        'Search for heavy equipment/machines in the fleet. Use this to check availability or find specific assets.'
      ),
      get_asset_details: tool(
        'get_asset_details',
        z.object({
          asset_id: z.string().describe('The Serial Number of the asset (e.g. CRANE-001)')
        }),
        z.any(),
        'Get detailed information about a specific machine/asset.'
      )
    };

    // --- FINANCE AGENT TOOLS ---
    export const financeTools = {
      search_invoices: tool(
        'search_invoices',
        z.object({
          customer: z.string().optional().describe('Filter by Customer Name'),
          status: z.enum(['Paid', 'Unpaid', 'Overdue', 'Draft']).optional().describe('Filter by Payment Status')
        }),
        z.array(z.any()),
        'Search for sales invoices. Useful for checking payment status or finding past bills.'
      ),
      create_draft_invoice: tool(
        'create_draft_invoice',
        z.object({
          customer: z.string().describe('Customer Name'),
          items: z.array(z.object({
            item_code: z.string(),
            qty: z.number(),
            rate: z.number()
          })).describe('List of items to bill')
        }),
        z.object({ message: z.string() }).or(z.object({ error: z.string() })),
        'Create a new Draft Invoice for a customer. Does not submit it.'
      )
    };

    // Export a combined registry for the Chat Route
    export const allTools = { ...crmTools, ...fleetTools, ...financeTools };