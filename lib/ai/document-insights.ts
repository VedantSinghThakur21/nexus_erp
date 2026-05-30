/** Shared AI insight badges for finance / ops list pages (heuristic, instant). */

export function quotationAiInsight(quotation: {
  status: string
  grand_total: number
}): { text: string; color: string } | null {
  if (quotation.status === 'Draft') {
    return {
      text: 'Follow-up Recommended',
      color:
        'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800',
    }
  }
  if (quotation.status === 'Open' && quotation.grand_total > 25000) {
    return {
      text: 'High Win Probability',
      color:
        'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
    }
  }
  if (quotation.status === 'Ordered') {
    return {
      text: 'Won — Convert to SO',
      color:
        'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
    }
  }
  return null
}

export function invoiceAiInsight(invoice: {
  status: string
  due_date?: string
  grand_total: number
}): { label: string; icon: string; color: string } | null {
  if (invoice.status === 'Paid') {
    return {
      label: 'LIKELY TO PAY',
      icon: 'verified',
      color:
        'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800',
    }
  }
  if (
    invoice.due_date &&
    new Date(invoice.due_date) < new Date() &&
    invoice.status !== 'Paid' &&
    invoice.status !== 'Cancelled'
  ) {
    return {
      label: 'HIGH RISK',
      icon: 'priority_high',
      color:
        'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800',
    }
  }
  if (invoice.status === 'Sent' && invoice.grand_total > 100000) {
    return {
      label: 'LIKELY TO PAY',
      icon: 'verified',
      color:
        'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800',
    }
  }
  if (invoice.status === 'Unpaid' || invoice.status === 'Overdue') {
    return {
      label: 'COLLECTION FOCUS',
      icon: 'schedule',
      color:
        'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800',
    }
  }
  return null
}

export type SalesOrderAiInsightIcon = 'sparkles' | 'trending-up' | 'check-circle'

export function salesOrderAiInsight(order: {
  status: string
  per_delivered?: number
  per_billed?: number
}): { label: string; icon: SalesOrderAiInsightIcon; color: string } {
  if (order.per_delivered === 100 && order.per_billed !== 100) {
    return {
      label: 'Ready to Bill',
      icon: 'sparkles',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    }
  }
  if (order.status === 'Draft') {
    return {
      label: 'Expedite Shipping',
      icon: 'trending-up',
      color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    }
  }
  if (order.per_delivered != null && order.per_delivered > 0 && order.per_delivered < 100) {
    return {
      label: 'In Fulfillment',
      icon: 'trending-up',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    }
  }
  return {
    label: 'On Track',
    icon: 'check-circle',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  }
}

export function salesOrderDeliveryRisk(order: { per_delivered?: number }): {
  label: string
  className: string
} {
  if (order.per_delivered === 100) {
    return { label: 'On Time', className: 'text-emerald-700' }
  }
  if (order.per_delivered && order.per_delivered > 0) {
    return { label: 'In Progress', className: 'text-blue-700' }
  }
  return { label: 'Delayed', className: 'text-red-700' }
}

export function projectAiInsight(project: {
  status: string
  percent_complete: number
  expected_end_date?: string
}): { text: string; color: string; icon: string } {
  if (project.status === 'Completed') {
    return { text: 'Completed Successfully', color: 'emerald', icon: 'check_circle' }
  }
  if (project.percent_complete === 0) {
    return { text: 'Not Started', color: 'slate', icon: 'schedule' }
  }

  if (project.expected_end_date) {
    const daysLeft =
      (new Date(project.expected_end_date).getTime() - Date.now()) / 86400000
    if (daysLeft < 0 && project.percent_complete < 100) {
      return { text: 'Past Due — At Risk', color: 'red', icon: 'warning' }
    }
  }

  if (project.percent_complete >= 80) {
    return { text: 'Ahead of Schedule', color: 'emerald', icon: 'trending_up' }
  }
  if (project.percent_complete >= 50) {
    return { text: 'On Track', color: 'blue', icon: 'auto_awesome' }
  }
  return { text: 'Bottleneck Detected', color: 'amber', icon: 'warning_amber' }
}

export function teamMemberAiInsight(member: { last_login?: string }): {
  message: string
  color: string
  icon: string
} | null {
  const daysSinceLogin = member.last_login
    ? Math.ceil(
        Math.abs(Date.now() - new Date(member.last_login).getTime()) / 86400000
      )
    : null

  if (!member.last_login) {
    return {
      message: 'Never logged in — send invite reminder',
      color: 'amber',
      icon: 'report_problem',
    }
  }

  if (daysSinceLogin !== null && daysSinceLogin <= 1) {
    return {
      message: 'High Activity',
      color: 'purple',
      icon: 'insights',
    }
  }

  if (daysSinceLogin !== null && daysSinceLogin > 30) {
    return {
      message: 'Inactive 30+ days — review access',
      color: 'amber',
      icon: 'report_problem',
    }
  }

  return null
}
