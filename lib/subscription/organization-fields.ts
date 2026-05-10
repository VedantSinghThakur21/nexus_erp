export const ORGANIZATION_SUBSCRIPTION_FIELDS = [
  {
    fieldname: 'subscription_plan',
    label: 'Subscription Plan',
    fieldtype: 'Select',
    options: 'free\npro\nenterprise',
    default: 'free',
    reqd: 1,
    in_list_view: 1,
  },
  {
    fieldname: 'subscription_status',
    label: 'Subscription Status',
    fieldtype: 'Select',
    options: 'trial\nactive\npending_payment\npast_due\ncancelled\nexpired',
    default: 'trial',
    reqd: 1,
    in_list_view: 1,
  },
  {
    fieldname: 'agentic_ai_enabled',
    label: 'Agentic AI Enabled',
    fieldtype: 'Check',
    default: 0,
  },
  {
    fieldname: 'plan_synced_at',
    label: 'Plan Synced At',
    fieldtype: 'Datetime',
  },
  {
    fieldname: 'plan_source',
    label: 'Plan Source',
    fieldtype: 'Select',
    options: 'saas_tenant\nstripe\nmanual',
    default: 'saas_tenant',
  },
  {
    fieldname: 'stripe_customer_id',
    label: 'Stripe Customer ID',
    fieldtype: 'Data',
    read_only: 1,
  },
  {
    fieldname: 'stripe_subscription_id',
    label: 'Stripe Subscription ID',
    fieldtype: 'Data',
    read_only: 1,
  },
] as const

export const SAAS_TENANT_BILLING_FIELDS = [
  {
    fieldname: 'stripe_customer_id',
    label: 'Stripe Customer ID',
    fieldtype: 'Data',
    read_only: 1,
  },
  {
    fieldname: 'stripe_subscription_id',
    label: 'Stripe Subscription ID',
    fieldtype: 'Data',
    read_only: 1,
  },
  {
    fieldname: 'subscription_status',
    label: 'Subscription Status',
    fieldtype: 'Select',
    options: 'trial\nactive\npending_payment\npast_due\ncancelled\nexpired',
    default: 'trial',
  },
] as const

