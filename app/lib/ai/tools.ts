import { tool } from 'ai';
import { z } from 'zod';
import { createLead, getLeads, updateLeadStatus, getOpportunities } from '@/app/actions/crm';
import { getFleet, getAsset } from '@/app/actions/fleet';
import { getInvoices, createInvoice } from '@/app/actions/invoices';

// --- CRM AGENT TOOLS ---

export const crmTools = {
  
  // 1. Create Lead
  create_lead: tool({
    description: 'Create a new sales lead in the CRM.',
    parameters: z.object({
      first_name: z.string().describe('First Name of the lead'),
      last_name: z.string().optional().describe('Last Name of the lead'),
      company_name: z.string().optional().describe('Company or Organization Name'),
      email_id: z.string().email().optional().describe('Email Address'),
      mobile_no: z.string().optional().describe('Phone Number'),
      status: z.enum(['Lead', 'Open', 'Replied', 'Opportunity', 'Interested']).optional().describe('Initial Status')
    }),
    returns: z.object({ message: z.string() }).or(z.object({ error: z.string() }))
  }),

  // 2. Search Leads
  search_leads: tool({
    description: 'Search for existing leads or list recent leads.',
    parameters: z.object({
      query: z.string().optional().describe('Search term (name or company)'),
      limit: z.number().optional().default(5).describe('Number of results to return')
    }),
    returns: z.array(z.any()),
    // ...existing code...
  }),

  // 3. Update Lead Status
  update_lead_status: tool({
    description: 'Update the status of a specific lead (e.g. mark as Interested or Converted).',
    parameters: z.object({
      lead_id: z.string().describe('The ID of the lead (e.g. LEAD-2024-001)'),
      status: z.string().describe('New Status')
    }),
    returns: z.object({ message: z.string() }).or(z.object({ error: z.string() })),
    // ...existing code...
  }),

  // 4. Get Opportunities
  get_opportunities: tool({
    description: 'List current sales opportunities and their stages.',
    parameters: z.object({}),
    returns: z.array(z.any()),
    // ...existing code...
  })
};

// --- FLEET (OPERATIONS) AGENT TOOLS ---

export const fleetTools = {
  // 5. Search Fleet / Check Availability
  search_fleet: tool({
    description: 'Search for heavy equipment/machines in the fleet. Use this to check availability or find specific assets.',
    parameters: z.object({
      query: z.string().optional().describe('Search term (e.g., "Crane", "Excavator", or Serial No)'),
      status: z.enum(['Active', 'Maintenance', 'Issued', 'Scrapped']).optional().describe('Filter by status')
    }),
    returns: z.array(z.any()),
    // ...existing code...
  }),

  // 6. Get Asset Details
  get_asset_details: tool({
    description: 'Get detailed information about a specific machine/asset.',
    parameters: z.object({
      asset_id: z.string().describe('The Serial Number of the asset (e.g. CRANE-001)')
    }),
    returns: z.any(),
    // ...existing code...
  }),
};

// --- FINANCE AGENT TOOLS ---

export const financeTools = {
  // 7. Search Invoices
  search_invoices: tool({
    description: 'Search for sales invoices. Useful for checking payment status or finding past bills.',
    parameters: z.object({
      customer: z.string().optional().describe('Filter by Customer Name'),
      status: z.enum(['Paid', 'Unpaid', 'Overdue', 'Draft']).optional().describe('Filter by Payment Status')
    }),
    returns: z.array(z.any()),
    // ...existing code...
  }),
  
  // 8. Create Draft Invoice
  create_draft_invoice: tool({
    description: 'Create a new Draft Invoice for a customer. Does not submit it.',
    parameters: z.object({
      customer: z.string().describe('Customer Name'),
      items: z.array(z.object({
        item_code: z.string(),
        qty: z.number(),
        rate: z.number()
      })).describe('List of items to bill')
    }),
  
    // ...existing code...
  })
};

// Export a combined registry for the Chat Route
export const allTools = { ...crmTools, ...fleetTools, ...financeTools };

// --- TOOL EXECUTION HANDLERS ---
export const toolHandlers = {
  create_lead: async (args: {
    first_name: string;
    last_name?: string;
    company_name?: string;
    email_id?: string;
    mobile_no?: string;
    status?: 'Lead' | 'Open' | 'Replied' | 'Opportunity' | 'Interested';
  }) => {
    const res = await createLead(args);
    if (res.error) return { error: res.error };
    return { message: `Success! Created lead for ${args.first_name}.` };
  },
  search_leads: async ({ query, limit }: { query?: string; limit?: number }) => {
    const leads = await getLeads();
    const filtered = query
      ? leads.filter(l =>
          l.lead_name.toLowerCase().includes(query.toLowerCase()) ||
          l.company_name?.toLowerCase().includes(query.toLowerCase())
        )
      : leads;
    return Array.isArray(filtered) ? filtered.slice(0, limit) : [];
  },
  update_lead_status: async ({ lead_id, status }: { lead_id: string; status: string }) => {
    const res = await updateLeadStatus(lead_id, status);
    if (res.error) return { error: res.error };
    return { message: `Success! Updated ${lead_id} to ${status}.` };
  },
  get_opportunities: async (_: {}) => {
    const opps = await getOpportunities();
    return Array.isArray(opps) ? opps.slice(0, 5) : [];
  },
  search_fleet: async ({ query, status }: { query?: string; status?: 'Active' | 'Maintenance' | 'Issued' | 'Scrapped' }) => {
    const fleet = await getFleet();
    let filtered = fleet;
    if (status) {
      filtered = filtered.filter(item => item.status === status);
    }
    if (query) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(item =>
        item.item_name.toLowerCase().includes(lowerQuery) ||
        item.name.toLowerCase().includes(lowerQuery) ||
        item.item_code.toLowerCase().includes(lowerQuery)
      );
    }
    return Array.isArray(filtered) ? filtered.slice(0, 5) : [];
  },
  get_asset_details: async ({ asset_id }: { asset_id: string }) => {
    const asset = await getAsset(asset_id);
    if (!asset || typeof asset !== 'object') return { error: "Asset not found." };
    return asset;
  },
  search_invoices: async ({ customer, status }: { customer?: string; status?: 'Paid' | 'Unpaid' | 'Overdue' | 'Draft' }) => {
    const invoices = await getInvoices();
    let filtered = invoices;
    if (status) {
      filtered = filtered.filter(inv => inv.status === status);
    }
    if (customer) {
      filtered = filtered.filter(inv =>
        inv.customer_name.toLowerCase().includes(customer.toLowerCase())
      );
    }
    return Array.isArray(filtered) ? filtered.slice(0, 5) : [];
  },
  create_draft_invoice: async ({ customer, items }: { customer: string; items: { item_code: string; qty: number; rate: number }[] }) => {
    const res = await createInvoice({
      customer,
      items,
      posting_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    if (res && typeof res === 'object' && 'error' in res && res.error) return { error: String(res.error) };
    return { message: 'Success! Draft Invoice created.' };
  }
};