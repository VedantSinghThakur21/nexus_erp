'use server'

import { frappeRequest } from "@/app/lib/api"
import { cookies } from 'next/headers'

// Get comprehensive dashboard statistics
export async function getDashboardStats(accessibleModules: string[] = []) {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0]
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

    // Helper: safely fetch, returning fallback on 403/error
    async function safeFetch<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
      try { return await fn() } catch { return fallback }
    }

    // 1. Win Rate Calculation (Quotations Converted to Sales Orders vs Lost)
    let winRate = 0;
    let winRateChange = 0;

    if (accessibleModules.includes('quotations')) {
      const quotationsWonMTD = await safeFetch(() => frappeRequest('frappe.client.get_count', 'GET', {
        doctype: 'Quotation',
        filters: `[["status", "=", "Ordered"], ["modified", ">=", "${monthStart}"]]`
      }), 0) as number

      const quotationsLostMTD = await safeFetch(() => frappeRequest('frappe.client.get_count', 'GET', {
        doctype: 'Quotation',
        filters: `[["status", "=", "Lost"], ["modified", ">=", "${monthStart}"]]`
      }), 0) as number

      const totalClosedMTD = (typeof quotationsWonMTD === 'number' ? quotationsWonMTD : 0) + (typeof quotationsLostMTD === 'number' ? quotationsLostMTD : 0)
      winRate = totalClosedMTD > 0 ? ((typeof quotationsWonMTD === 'number' ? quotationsWonMTD : 0) / totalClosedMTD) * 100 : 0

      const quotationsWonLastMonth = await safeFetch(() => frappeRequest('frappe.client.get_count', 'GET', {
        doctype: 'Quotation',
        filters: `[["status", "=", "Ordered"], ["modified", ">=", "${lastMonthStart}"], ["modified", "<=", "${lastMonthEnd}"]]`
      }), 0) as number

      const quotationsLostLastMonth = await safeFetch(() => frappeRequest('frappe.client.get_count', 'GET', {
        doctype: 'Quotation',
        filters: `[["status", "=", "Lost"], ["modified", ">=", "${lastMonthStart}"], ["modified", "<=", "${lastMonthEnd}"]]`
      }), 0) as number

      const totalClosedLastMonth = (typeof quotationsWonLastMonth === 'number' ? quotationsWonLastMonth : 0) + (typeof quotationsLostLastMonth === 'number' ? quotationsLostLastMonth : 0)
      const lastMonthWinRate = totalClosedLastMonth > 0 ? ((typeof quotationsWonLastMonth === 'number' ? quotationsWonLastMonth : 0) / totalClosedLastMonth) * 100 : 0
      winRateChange = winRate - lastMonthWinRate
    }

    // 2. Pipeline Value (Sum of all open Quotations + Open Sales Orders)
    let pipelineValue = 0;

    if (accessibleModules.includes('quotations')) {
      const quotes = await safeFetch(() => frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Quotation',
        fields: '["base_grand_total"]',
        filters: '[["status", "=", "Open"]]',
        limit_page_length: 1000
      }), []) as any[]
      if (Array.isArray(quotes)) {
        pipelineValue += quotes.reduce((sum: number, q: any) => sum + (q.base_grand_total || 0), 0)
      }
    }

    if (accessibleModules.includes('sales-orders')) {
      const orders = await safeFetch(() => frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Sales Order',
        fields: '["base_grand_total"]',
        filters: '[["status", "in", ["Draft", "To Deliver and Bill", "To Bill"]]]',
        limit_page_length: 1000
      }), []) as any[]
      if (Array.isArray(orders)) {
        pipelineValue += orders.reduce((sum: number, o: any) => sum + (o.base_grand_total || 0), 0)
      }
    }

    // 3. Revenue MTD (from Paid Sales Invoices this month)
    let revenue = 0;
    if (accessibleModules.includes('invoices')) {
      const revenueInvoices = await safeFetch(() => frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Sales Invoice',
        fields: '["base_grand_total"]',
        filters: `[["status", "in", ["Paid", "Partly Paid"]], ["posting_date", ">=", "${monthStart}"]]`,
        limit_page_length: 1000
      }), []) as any[]
      revenue = Array.isArray(revenueInvoices)
        ? revenueInvoices.reduce((sum: number, inv: any) => sum + (inv.base_grand_total || 0), 0)
        : 0
    }

    // 4. Active Leads
    let currentLeadCount = 0;
    let leadsChange = 0;

    if (accessibleModules.includes('crm')) {
      const activeLeads = await safeFetch(() => frappeRequest('frappe.client.get_count', 'GET', {
        doctype: 'Lead',
        filters: '[["status", "in", ["Open", "Replied", "Interested"]]]'
      }), 0) as number

      const lastMonthLeads = await safeFetch(() => frappeRequest('frappe.client.get_count', 'GET', {
        doctype: 'Lead',
        filters: `[["status", "in", ["Open", "Replied", "Interested"]], ["creation", ">=", "${lastMonthStart}"], ["creation", "<=", "${lastMonthEnd}"]]`
      }), 0) as number

      currentLeadCount = typeof activeLeads === 'number' ? activeLeads : 0
      const lastLeadCount = typeof lastMonthLeads === 'number' ? lastMonthLeads : 0
      leadsChange = lastLeadCount > 0 ? ((currentLeadCount - lastLeadCount) / lastLeadCount) * 100 : 0
    }

    return {
      pipelineValue,
      revenue,
      openOpportunities: currentLeadCount,
      winRate,
      winRateChange,
      leadsChange,
    }

  } catch (error) {
    console.error("Dashboard Stats Error:", error)
    return {
      pipelineValue: 0,
      revenue: 0,
      openOpportunities: 0,
      winRate: 0,
      winRateChange: 0,
      leadsChange: 0,
    }
  }
}

// Get high-probability opportunities for the main table (using Quotations now)
export async function getOpportunities(accessibleModules: string[] = []) {
  try {
    if (!accessibleModules.includes('quotations')) return []

    const quotes = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Quotation',
      fields: '["name", "customer_name", "party_name", "base_grand_total", "status", "modified"]',
      filters: '[["status", "in", ["Open"]]]',
      order_by: 'modified desc',
      limit_page_length: 100
    })

    if (!Array.isArray(quotes)) {
      return []
    }

    return quotes.map((q: any) => ({
      name: q.name || '',
      customer_name: q.customer_name || q.party_name || 'Unknown',
      party_name: q.party_name || q.customer_name || 'Unknown',
      sales_stage: 'Proposal/Price Quote',
      opportunity_amount: typeof q.base_grand_total === 'number' ? q.base_grand_total : 0,
      // For quotations, we consider them 75% probable by default if open
      probability: 75,
      status: q.status || 'Open',
      modified: q.modified || new Date().toISOString(),
    }))
  } catch (error) {
    console.error("Get Opportunities Error:", error)
    return []
  }
}

// Get recent activities for Team Performance section
export async function getRecentActivities(accessibleModules: string[] = []) {
  try {
    const allActivities: Array<{
      type: 'closed-deal' | 'new-lead' | 'outbound' | 'booking-scheduled';
      owner: string;
      company: string;
      time: string;
      timestamp: Date;
    }> = []

    // 1. Fetch Recent Closed Deals (Sales Invoices Paid / SOs Created)
    if (accessibleModules.includes('sales-orders')) {
      try {
        const closedDeals = await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'Sales Order',
          fields: '["name", "customer_name", "modified", "owner"]',
          filters: '[["status", "in", ["To Deliver and Bill", "To Bill", "Completed"]]]',
          order_by: 'modified desc',
          limit_page_length: 5
        })

        if (Array.isArray(closedDeals)) {
          closedDeals.forEach((deal: any) => {
            allActivities.push({
              type: 'closed-deal',
              owner: deal.owner || 'Team Member',
              company: deal.customer_name || 'Unknown Company',
              time: getTimeAgo(new Date(deal.modified)),
              timestamp: new Date(deal.modified)
            })
          })
        }
      } catch (error) {
        console.error("Error fetching closed deals:", error)
      }
    }

    // 2. Fetch Recent New Quotes
    if (accessibleModules.includes('quotations')) {
      try {
        const newQuotes = await frappeRequest('frappe.client.get_list', 'GET', {
          doctype: 'Quotation',
          fields: '["name", "customer_name", "creation", "owner"]',
          filters: '[["status", "in", ["Open", "Draft"]]]',
          order_by: 'creation desc',
          limit_page_length: 5
        })

        if (Array.isArray(newQuotes)) {
          newQuotes.forEach((quote: any) => {
            allActivities.push({
              type: 'new-lead',
              owner: quote.owner || 'Team Member',
              company: quote.customer_name || 'Unknown Company',
              time: getTimeAgo(new Date(quote.creation)),
              timestamp: new Date(quote.creation)
            })
          })
        }
      } catch (error) {
        console.error("Error fetching new quotes:", error)
      }
    }

    // Sort all activities by timestamp (most recent first) and return top 4
    const sortedActivities = allActivities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 4)
      .map(({ timestamp, ...activity }) => activity)

    return sortedActivities
  } catch (error) {
    console.error("Get Recent Activities Error:", error)
    return []
  }
}

// Get deals at risk (for Intelligence Hub)
export async function getAtRiskDeals(accessibleModules: string[] = []) {
  try {
    if (!accessibleModules.includes('quotations')) return []

    // Get stagnant quotations
    const quotes = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Quotation',
      fields: '["name", "customer_name", "party_name", "modified"]',
      filters: '[["status", "in", ["Open"]]]',
      order_by: 'modified asc',
      limit_page_length: 3
    })

    if (!Array.isArray(quotes)) {
      return []
    }

    return quotes.map((q: any) => {
      const modifiedDate = new Date(q.modified);
      const daysSinceActivity = Math.floor((Date.now() - modifiedDate.getTime()) / (1000 * 60 * 60 * 24));

      let reason = '';
      if (daysSinceActivity > 14) {
        reason = `No activity for ${daysSinceActivity} days. Quote may be going cold.`;
      } else {
        reason = `Quote is pending customer follow-up.`;
      }

      return {
        name: q.name,
        customer_name: q.customer_name || q.party_name || 'Unknown',
        days_since_activity: daysSinceActivity,
        reason: reason,
      };
    });
  } catch (error) {
    console.error("Get At Risk Deals Error:", error)
    return []
  }
}

// Get Sales Pipeline Funnel Data
export async function getSalesPipelineFunnel(accessibleModules: string[] = []) {
  try {
    // Get Leads
    let leadsCount: unknown = 0;
    if (accessibleModules.includes('crm')) {
      leadsCount = await frappeRequest('frappe.client.get_count', 'GET', {
        doctype: 'Lead',
        filters: '[["status", "in", ["Open", "Replied", "Interested"]]]'
      })
    }

    // Get Quotes
    let quotes: unknown = [];
    if (accessibleModules.includes('quotations')) {
      quotes = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Quotation',
        fields: '["base_grand_total", "status"]',
        filters: '[["status", "in", ["Draft", "Open"]]]',
        limit_page_length: 1000
      })
    }

    // Get Orders
    let orders: unknown = [];
    if (accessibleModules.includes('sales-orders')) {
      orders = await frappeRequest('frappe.client.get_list', 'GET', {
        doctype: 'Sales Order',
        fields: '["base_grand_total", "status"]',
        filters: '[["status", "in", ["Draft", "To Deliver and Bill", "To Bill"]]]',
        limit_page_length: 1000
      })
    }

    const stages = {
      'Lead': { count: typeof leadsCount === 'number' ? leadsCount : 0, value: (typeof leadsCount === 'number' ? leadsCount : 0) * 100000 },
      'Draft Quote': { count: 0, value: 0 },
      'Open Quote': { count: 0, value: 0 },
      'Sales Order': { count: 0, value: 0 },
    }

    if (Array.isArray(quotes)) {
      quotes.forEach((q: any) => {
        if (q.status === 'Draft') {
          stages['Draft Quote'].count++
          stages['Draft Quote'].value += q.base_grand_total || 0
        } else {
          stages['Open Quote'].count++
          stages['Open Quote'].value += q.base_grand_total || 0
        }
      })
    }

    if (Array.isArray(orders)) {
      orders.forEach((o: any) => {
        stages['Sales Order'].count++
        stages['Sales Order'].value += o.base_grand_total || 0
      })
    }

    return [
      { stage: 'Lead', count: stages['Lead'].count, value: stages['Lead'].value },
      { stage: 'Draft Quote', count: stages['Draft Quote'].count, value: stages['Draft Quote'].value },
      { stage: 'Open Quote', count: stages['Open Quote'].count, value: stages['Open Quote'].value },
      { stage: 'Sales Order', count: stages['Sales Order'].count, value: stages['Sales Order'].value },
    ]
  } catch (error) {
    console.error("Pipeline Funnel Error:", error)
    return []
  }
}

// Get Deals by Stage (for bar chart if we use it)
export async function getDealsByStage(accessibleModules: string[] = []) {
  try {
    if (!accessibleModules.includes('quotations')) return []

    const quotes = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Quotation',
      fields: '["status"]',
      filters: '[["status", "in", ["Draft", "Open"]]]',
      limit_page_length: 1000
    })

    const stages: Record<string, number> = {
      'DRAFT': 0,
      'OPEN': 0,
      'WON': 0
    }

    if (Array.isArray(quotes)) {
      quotes.forEach((q: any) => {
        if (q.status === 'Draft') stages.DRAFT++
        else if (q.status === 'Open') stages.OPEN++
      })
    }

    // Get won this month
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const wonCount = await frappeRequest('frappe.client.get_count', 'GET', {
      doctype: 'Quotation',
      filters: `[["status", "=", "Ordered"], ["modified", ">=", "${monthStart}"]]`
    })
    stages.WON = typeof wonCount === 'number' ? wonCount : 0

    return [
      { stage: 'DRAFT', count: stages.DRAFT },
      { stage: 'OPEN', count: stages.OPEN },
      { stage: 'WON', count: stages.WON }
    ]
  } catch (error) {
    console.error("Deals by Stage Error:", error)
    return []
  }
}

// Get My Open Leads
export async function getMyOpenLeads() {
  try {
    // Get logged-in user from cookies (set by Frappe during login)
    const cookieStore = await cookies()
    const userEmail = cookieStore.get('user_email')?.value || cookieStore.get('user_id')?.value

    if (!userEmail) {
      console.error('No user found in cookies for getMyOpenLeads')
      return []
    }

    const leads = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Lead',
      fields: '["name", "lead_name", "company_name", "status", "modified"]',
      filters: `[["status", "in", ["Open", "Replied", "Interested"]], ["owner", "=", "${userEmail}"]]`,
      order_by: 'modified desc',
      limit_page_length: 5
    })

    // Validate leads is an array
    if (!Array.isArray(leads)) {
      console.error("getMyOpenLeads: leads is not an array:", leads)
      return []
    }

    return leads.map((lead: any) => ({
      name: lead.lead_name || 'Unknown',
      company: lead.company_name || 'N/A',
      status: lead.status || 'Open',
      lastContact: getTimeAgo(new Date(lead.modified))
    }))
  } catch (error) {
    console.error("My Open Leads Error:", error)
    return []
  }
}

// Get My Open Opportunities
export async function getMyOpenOpportunities() {
  try {
    // Get logged-in user from cookies (set by Frappe during login)
    const cookieStore = await cookies()
    const userEmail = cookieStore.get('user_email')?.value || cookieStore.get('user_id')?.value

    if (!userEmail) {
      console.error('No user found in cookies for getMyOpenOpportunities')
      return []
    }

    const opportunities = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Opportunity',
      fields: '["name", "title", "sales_stage", "opportunity_amount", "probability"]',
      filters: `[["status", "in", ["Open", "Quotation"]], ["owner", "=", "${userEmail}"]]`,
      order_by: 'modified desc',
      limit_page_length: 5
    })

    // Validate opportunities is an array
    if (!Array.isArray(opportunities)) {
      console.error("getMyOpenOpportunities: opportunities is not an array:", opportunities)
      return []
    }

    return opportunities.map((opp: any) => ({
      name: opp.title || opp.name || 'Unknown',
      stage: opp.sales_stage || 'Prospecting',
      value: typeof opp.opportunity_amount === 'number' ? opp.opportunity_amount : 0,
      probability: typeof opp.probability === 'number' ? opp.probability : 0
    }))
  } catch (error) {
    console.error("My Open Opportunities Error:", error)
    return []
  }
}

// Get Leads by Source (for donut chart)
export async function getLeadsBySource(accessibleModules: string[] = []) {
  try {
    if (!accessibleModules.includes('crm')) return [];

    // Get all leads except converted ones
    const leads = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Lead',
      fields: '["source"]',
      filters: '[["status", "!=", "Converted"]]',
      limit_page_length: 1000
    });

    // Validate leads is an array
    if (!Array.isArray(leads)) {
      console.error("getLeadsBySource: leads is not an array:", leads);
      return [];
    }

    // Group by source
    const sourceGroups: Record<string, number> = {};
    let total = 0;

    leads.forEach((lead: any) => {
      // Use source field, default to 'Walk In' if not specified
      const source = lead.source || 'Walk In';
      sourceGroups[source] = (sourceGroups[source] || 0) + 1;
      total++;
    });

    // Convert to array and calculate percentages
    const result = Object.entries(sourceGroups).map(([source, count]) => ({
      source,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    })).sort((a, b) => b.count - a.count);

    return result;

  } catch (error) {
    console.error("Get Leads By Source Error:", error);
    return [];
  }
}

// Helper: Time ago formatter
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 1) return 'just now'
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}