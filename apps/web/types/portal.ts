export type SubscriptionStatus = 'DRAFT' | 'QUOTATION' | 'CONFIRMED' | 'ACTIVE' | 'CLOSED';
export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED' | 'OVERDUE';

export interface PortalSubscriptionLine {
  id: string;
  productId: string;
  productName: string;
  variantId?: string | null;
  variantName?: string | null;
  quantity: number;
  unitPrice: number | string;
  amount: number | string;
  taxAmount?: number | string;
}

export interface PortalSubscription {
  id: string;
  number: string;
  status: SubscriptionStatus;
  planName: string;
  billingPeriod: string;
  startDate: string;
  expiryDate?: string | null;
  nextBillingDate?: string | null;
  allowEarlyClose?: boolean;
  allowPause?: boolean;
  allowRenew?: boolean;
  totalAmount?: number | string;
  lines: PortalSubscriptionLine[];
}

export interface PortalInvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number | string;
  discountAmount: number | string;
  taxAmount: number | string;
  amount: number | string;
}

export interface PortalInvoice {
  id: string;
  number: string;
  subscriptionId: string;
  status: InvoiceStatus;
  isOverdue?: boolean;
  issueDate: string;
  dueDate: string;
  subtotal: number | string;
  discountTotal: number | string;
  taxTotal: number | string;
  total: number | string;
  amountPaid: number | string;
  lines: PortalInvoiceLine[];
}

