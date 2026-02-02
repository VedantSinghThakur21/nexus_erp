'use server'

import { frappeRequest } from "@/app/lib/api"
import { cookies } from 'next/headers'

// Get comprehensive dashboard statistics
export async function getDashboardStats() {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0]
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

    // 1. Win Rate Calculation
    // Get won deals this month
    const dealsWonMTD = await frappeRequest('frappe.client.get_count', 'GET', {
      doctype: 'Opportunity',
      filters: `[["status", "=", "Converted"], ["modified", ">=", "${monthStart}"]]`
    })

    // Get lost deals this month
    const dealsLostMTD = await frappeRequest('frappe.client.get_count', 'GET', {
      doctype: 'Opportunity',
      filters: `[["status", "=", "Lost"], ["modified", ">=", "${monthStart}"]]`
    })

    const totalClosedMTD = (typeof dealsWonMTD === 'number' ? dealsWonMTD : 0) + (typeof dealsLostMTD === 'number' ? dealsLostMTD : 0)
    const winRate = totalClosedMTD > 0 ? ((typeof dealsWonMTD === 'number' ? dealsWonMTD : 0) / totalClosedMTD) * 100 : 0

    // Get last month's win rate for comparison
    const dealsWonLastMonth = await frappeRequest('frappe.client.get_count', 'GET', {
      doctype: 'Opportunity',
      filters: `[["status", "=", "Converted"], ["modified", ">=", "${lastMonthStart}"], ["modified", "<=", "${lastMonthEnd}"]]`
    })

    const dealsLostLastMonth = await frappeRequest('frappe.client.get_count', 'GET', {
      doctype: 'Opportunity',
      filters: `[["status", "=", "Lost"], ["modified", ">=", "${lastMonthStart}"], ["modified", "<=", "${lastMonthEnd}"]]`
    })

    const totalClosedLastMonth = (typeof dealsWonLastMonth === 'number' ? dealsWonLastMonth : 0) + (typeof dealsLostLastMonth === 'number' ? dealsLostLastMonth : 0)
    const lastMonthWinRate = totalClosedLastMonth > 0 ? ((typeof dealsWonLastMonth === 'number' ? dealsWonLastMonth : 0) / totalClosedLastMonth) * 100 : 0
    const winRateChange = winRate - lastMonthWinRate

    // 2. Pipeline Value (Sum of all open opportunities)
    const opportunities = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Opportunity',
      fields: '["opportunity_amount"]',
      filters: '[["status", "in", ["Open", "Quotation"]]]',
      limit_page_length: 1000
    })
    const pipelineValue = Array.isArray(opportunities)
      ? opportunities.reduce((sum: number, opp: any) => sum + (opp.opportunity_amount || 0), 0)
      : 0

    // 3. Revenue MTD (from converted opportunities this month)
    const revenueOpps = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Opportunity',
      fields: '["opportunity_amount"]',
      filters: `[["status", "=", "Converted"], ["modified", ">=", "${monthStart}"]]`,
      limit_page_length: 1000
    })
    const revenue = Array.isArray(revenueOpps)
      ? revenueOpps.reduce((sum: number, opp: any) => sum + (opp.opportunity_amount || 0), 0)
      : 0

    // 4. Active Leads Count
    const activeLeads = await frappeRequest('frappe.client.get_count', 'GET', {
      doctype: 'Lead',
      filters: '[["status", "in", ["Open", "Replied", "Interested"]]]'
    })

    // Get last month's active leads for comparison
    const lastMonthLeads = await frappeRequest('frappe.client.get_count', 'GET', {
      doctype: 'Lead',
      filters: `[["status", "in", ["Open", "Replied", "Interested"]], ["creation", ">=", "${lastMonthStart}"], ["creation", "<=", "${lastMonthEnd}"]]`
    })

    const currentLeadCount = typeof activeLeads === 'number' ? activeLeads : 0
    const lastLeadCount = typeof lastMonthLeads === 'number' ? lastMonthLeads : 0
    const leadsChange = lastLeadCount > 0 ? ((currentLeadCount - lastLeadCount) / lastLeadCount) * 100 : 0

    return {
      pipelineValue: typeof pipelineValue === 'number' ? pipelineValue : 0,
      revenue: typeof revenue === 'number' ? revenue : 0,
      openOpportunities: currentLeadCount,
      winRate: typeof winRate === 'number' ? winRate : 0,
      winRateChange: typeof winRateChange === 'number' ? winRateChange : 0,
      leadsChange: typeof leadsChange === 'number' ? leadsChange : 0,
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

// Get high-probability opportunities for the main table
export async function getOpportunities() {
  try {
    const opportunities = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Opportunity',
      fields: '["name", "customer_name", "party_name", "sales_stage", "opportunity_amount", "probability", "status", "modified"]',
      filters: '[["status", "in", ["Open", "Quotation"]]]',
      order_by: 'probability desc, modified desc',
      limit_page_length: 100
    })

    if (!Array.isArray(opportunities)) {
      console.error("getOpportunities: opportunities is not an array:", opportunities)
      return []
    }

    return opportunities.map((opp: any) => ({
      name: opp.name || '',
      customer_name: opp.customer_name || opp.party_name || 'Unknown',
      party_name: opp.party_name || opp.customer_name || 'Unknown',
      sales_stage: opp.sales_stage || 'Proposal',
      opportunity_amount: typeof opp.opportunity_amount === 'number' ? opp.opportunity_amount : 0,
      probability: typeof opp.probability === 'number' ? opp.probability : 0,
      status: opp.status || 'Open',
      modified: opp.modified || new Date().toISOString(),
    }))
  } catch (error) {
    console.error("Get Opportunities Error:", error)
    return []
  }
}

// Get recent activities for the activity feed
export async function getRecentActivities() {
  try {
    const activities = []

    // 1. Recent Closed Won Deals
    const recentWon = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Opportunity',
      fields: '["name", "customer_name", "party_name", "opportunity_amount", "modified"]',
      filters: '[["status", "=", "Converted"]]',
      order_by: 'modified desc',
      limit_page_length: 1
    })

    if (Array.isArray(recentWon) && recentWon.length > 0) {
      const opp = recentWon[0]
      activities.push({
        type: 'closed-won',
        title: opp.customer_name || opp.party_name || 'Unknown Customer',
        subtitle: `Cyberdyne Corp • $${((opp.opportunity_amount || 0) / 1000).toFixed(0)}k`,
        time: getTimeAgo(new Date(opp.modified)),
      })
    }

    // 2. Hot Prospects (High Probability)
    const hotProspects = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Opportunity',
      fields: '["name", "customer_name", "party_name", "probability", "modified"]',
      filters: '[["status", "in", ["Open", "Quotation"]], ["probability", ">=", 70]]',
      order_by: 'modified desc',
      limit_page_length: 1
    })

    if (Array.isArray(hotProspects) && hotProspects.length > 0) {
      const opp = hotProspects[0]
      activities.push({
        type: 'hot-prospect',
        title: opp.customer_name || opp.party_name || 'Unknown Customer',
        subtitle: 'TechFlow Systems',
        time: getTimeAgo(new Date(opp.modified)),
      })
    }

    // 3. Recent Engagement (Recently Modified Opportunities)
    const recentEngagement = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Opportunity',
      fields: '["name", "customer_name", "party_name", "sales_stage", "modified"]',
      filters: '[["status", "in", ["Open", "Quotation"]]]',
      order_by: 'modified desc',
      limit_page_length: 1
    })

    if (Array.isArray(recentEngagement) && recentEngagement.length > 0) {
      const opp = recentEngagement[0]
      activities.push({
        type: 'engagement',
        title: opp.customer_name || opp.party_name || 'Unknown Customer',
        subtitle: 'Stark Ind. Proposal Opened',
        time: getTimeAgo(new Date(opp.modified)),
      })
    }

    return activities
  } catch (error) {
    console.error("Get Recent Activities Error:", error)
    return []
  }
}

// Get deals at risk (for Intelligence Hub)
export async function getAtRiskDeals() {
  try {
    // Get opportunities with low probability or stagnant
    const opportunities = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Opportunity',
      fields: '["name", "customer_name", "party_name", "probability", "modified"]',
      filters: '[["status", "in", ["Open", "Quotation"]], ["probability", "<=", 50]]',
      order_by: 'probability asc, modified asc',
      limit_page_length: 3
    })

    if (!Array.isArray(opportunities)) {
      console.error("getAtRiskDeals: opportunities is not an array:", opportunities)
      return []
    }

    return opportunities.map((opp: any) => ({
      name: opp.customer_name || opp.party_name || 'Unknown',
      healthScore: opp.probability || 42,
      modified: opp.modified,
    }))
  } catch (error) {
    console.error("Get At Risk Deals Error:", error)
    return []
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
export async function getLeadsBySource() {
  try {
    // Get all active leads with source field
    const leads = await frappeRequest('frappe.client.get_list', 'GET', {
      doctype: 'Lead',
      fields: '["source"]',
      filters: '[["status", "in", ["Open", "Replied", "Interested"]]]',
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
      const source = lead.source || 'Unknown';
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