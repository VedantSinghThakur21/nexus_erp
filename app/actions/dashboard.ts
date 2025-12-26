'use server'

import { frappeRequest } from "@/app/lib/api"

export async function getDashboardStats() {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0]
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    
    // 1. New Leads Today
    const newLeadsToday = await frappeRequest('frappe.client.get_count', 'GET', {
      doctype: 'Lead',
      filters: `[["creation", ">=", "${todayStart}"]]`
    })

    // 2. Open Opportunities Count
    const openOpportunities = await frappeRequest('frappe.client.get_count', 'GET', {
      doctype: 'Opportunity',
      filters: '[["status", "in", ["Open", "Quotation"]]]'
    })

    // 3. Pipeline Value (Sum of all open opportunities)
    const opportunities = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Opportunity',
      fields: '["opportunity_amount"]',
      filters: '[["status", "in", ["Open", "Quotation"]]]',
      limit_page_length: 1000
    })
    const pipelineValue = Array.isArray(opportunities) 
      ? opportunities.reduce((sum: number, opp: any) => sum + (opp.opportunity_amount || 0), 0)
      : 0

    // 4. Deals Won This Month (Converted Opportunities)
    const dealsWonMTD = await frappeRequest('frappe.client.get_count', 'GET', {
      doctype: 'Opportunity',
      filters: `[["status", "=", "Converted"], ["modified", ">=", "${monthStart}"]]`
    })

    // 5. Win Rate % (Won / (Won + Lost) this month)
    const dealsLostMTD = await frappeRequest('frappe.client.get_count', 'GET', {
      doctype: 'Opportunity',
      filters: `[["status", "=", "Lost"], ["modified", ">=", "${monthStart}"]]`
    })
    const totalClosedMTD = (typeof dealsWonMTD === 'number' ? dealsWonMTD : 0) + (typeof dealsLostMTD === 'number' ? dealsLostMTD : 0)
    const winRate = totalClosedMTD > 0 ? Math.round(((typeof dealsWonMTD === 'number' ? dealsWonMTD : 0) / totalClosedMTD) * 100) : 0

    // 6. Get Total Revenue (from Invoices)
    const invoices = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Sales Invoice',
      fields: '["grand_total"]',
      filters: '[["docstatus", "=", 1]]',
      limit_page_length: 1000
    })
    const revenue = Array.isArray(invoices)
      ? invoices.reduce((sum: number, inv: any) => sum + (inv.grand_total || 0), 0)
      : 0

    // 7. Get Active Bookings (Sales Orders)
    const bookings = await frappeRequest('frappe.client.get_count', 'GET', {
      doctype: 'Sales Order',
      filters: '[["status", "not in", ["Completed", "Cancelled"]]]'
    })

    return {
      // CRM Metrics
      newLeadsToday: typeof newLeadsToday === 'number' ? newLeadsToday : 0,
      openOpportunities: typeof openOpportunities === 'number' ? openOpportunities : 0,
      pipelineValue: typeof pipelineValue === 'number' ? pipelineValue : 0,
      dealsWonMTD: typeof dealsWonMTD === 'number' ? dealsWonMTD : 0,
      winRate: typeof winRate === 'number' ? winRate : 0,
      // Legacy Metrics
      revenue: typeof revenue === 'number' ? revenue : 0,
      active_bookings: typeof bookings === 'number' ? bookings : 0,
      fleet_status: "N/A"
    }

  } catch (error) {
    console.error("Dashboard Stats Error:", error)
    return {
      newLeadsToday: 0,
      openOpportunities: 0,
      pipelineValue: 0,
      dealsWonMTD: 0,
      winRate: 0,
      revenue: 0,
      active_bookings: 0,
      fleet_status: "N/A"
    }
  }
}

// Get Sales Pipeline Funnel Data
export async function getSalesPipelineFunnel() {
  try {
    // Get leads count
    const leadsCount = await frappeRequest('frappe.client.get_count', 'GET', {
      doctype: 'Lead',
      filters: '[["status", "in", ["Open", "Replied", "Interested"]]]'
    })

    // Get opportunities by sales stage with their values
    const opportunities = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Opportunity',
      fields: '["sales_stage", "opportunity_amount"]',
      filters: '[["status", "in", ["Open", "Quotation"]]]',
      limit_page_length: 1000
    })

    // Validate opportunities is an array
    if (!Array.isArray(opportunities)) {
      console.error("getSalesPipelineFunnel: opportunities is not an array:", opportunities)
      return []
    }

    // Group by stage
    const stages: Record<string, { count: number, value: number }> = {
      'Lead': { count: typeof leadsCount === 'number' ? leadsCount : 0, value: (typeof leadsCount === 'number' ? leadsCount : 0) * 100000 },
      'Prospecting': { count: 0, value: 0 },
      'Qualification': { count: 0, value: 0 },
      'Proposal': { count: 0, value: 0 },
      'Negotiation': { count: 0, value: 0 }
    }

    opportunities.forEach((opp: any) => {
      const stage = opp.sales_stage || 'Prospecting'
      if (stages[stage]) {
        stages[stage].count++
        stages[stage].value += opp.opportunity_amount || 0
      }
    })

    return [
      { stage: 'Lead', count: stages.Lead.count, value: stages.Lead.value },
      { stage: 'Prospecting', count: stages.Prospecting.count, value: stages.Prospecting.value },
      { stage: 'Qualification', count: stages.Qualification.count, value: stages.Qualification.value },
      { stage: 'Proposal', count: stages.Proposal.count, value: stages.Proposal.value },
      { stage: 'Negotiation', count: stages.Negotiation.count, value: stages.Negotiation.value }
    ]
  } catch (error) {
    console.error("Pipeline Funnel Error:", error)
    return []
  }
}

// Get Deals by Stage (for bar chart)
export async function getDealsByStage() {
  try {
    const opportunities = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Opportunity',
      fields: '["sales_stage"]',
      filters: '[["status", "in", ["Open", "Quotation"]]]',
      limit_page_length: 1000
    })

    // Validate opportunities is an array
    if (!Array.isArray(opportunities)) {
      console.error("getDealsByStage: opportunities is not an array:", opportunities)
      return []
    }

    const stages: Record<string, number> = {
      'PROSP': 0,  // Prospecting
      'QUAL': 0,   // Qualification  
      'ANALY': 0,  // Analysis/Needs Analysis
      'PROP': 0,   // Proposal
      'WON': 0     // Won
    }

    opportunities.forEach((opp: any) => {
      const stage = opp.sales_stage
      if (stage === 'Prospecting') stages.PROSP++
      else if (stage === 'Qualification') stages.QUAL++
      else if (stage === 'Needs Analysis') stages.ANALY++
      else if (stage === 'Proposal' || stage === 'Negotiation') stages.PROP++
    })

    // Get won this month
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const wonCount = await frappeRequest('frappe.client.get_count', 'GET', {
      doctype: 'Opportunity',
      filters: `[["status", "=", "Converted"], ["modified", ">=", "${monthStart}"]]`
    })
    stages.WON = typeof wonCount === 'number' ? wonCount : 0

    return [
      { stage: 'PROSP', count: stages.PROSP },
      { stage: 'QUAL', count: stages.QUAL },
      { stage: 'ANALY', count: stages.ANALY },
      { stage: 'PROP', count: stages.PROP },
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
    const userEmail = await frappeRequest('frappe.auth.get_logged_user')
    
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
    const userEmail = await frappeRequest('frappe.auth.get_logged_user')
    
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

// Helper: Time ago formatter
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}
