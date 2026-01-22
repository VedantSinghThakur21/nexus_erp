// Utility functions for delivery status in sales order workflow

export type DeliveryStatus = 'Not Delivered' | 'Partly Delivered' | 'Fully Delivered' | 'Closed' | 'Not Applicable'

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  'Not Delivered': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Partly Delivered': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Fully Delivered': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Closed': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  'Not Applicable': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
}

export const DELIVERY_STATUS_DESCRIPTION: Record<DeliveryStatus, string> = {
  'Not Delivered': 'No items have been delivered',
  'Partly Delivered': 'Some items have been delivered',
  'Fully Delivered': 'All items have been delivered - ready for invoicing',
  'Closed': 'Order is closed',
  'Not Applicable': 'Order does not require delivery'
}

// Calculate delivery status based on delivery percentages
export function calculateDeliveryStatus(perDelivered?: number): DeliveryStatus {
  if (perDelivered === undefined) return 'Not Applicable'
  if (perDelivered === 0) return 'Not Delivered'
  if (perDelivered < 100) return 'Partly Delivered'
  if (perDelivered >= 100) return 'Fully Delivered'
  return 'Not Applicable'
}

// Determine if order is ready for invoicing
export function isReadyForInvoice(deliveryStatus?: string, status?: string): boolean {
  return deliveryStatus === 'Fully Delivered' && 
         (status === 'To Bill' || status === 'To Deliver and Bill' || status === 'Completed')
}

// Get invoice availability message
export function getInvoiceReadinessMessage(deliveryStatus?: string, status?: string): string {
  if (!deliveryStatus) return 'Delivery status unknown'
  if (deliveryStatus !== 'Fully Delivered') {
    return `Cannot invoice: Order status is ${deliveryStatus.toLowerCase()}`
  }
  if (status === 'To Deliver') {
    return 'Order delivered but billing not processed'
  }
  return 'Ready for invoicing'
}
