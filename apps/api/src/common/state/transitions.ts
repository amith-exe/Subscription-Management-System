import { InvoiceStatus, SubscriptionStatus } from '@prisma/client';

export const subscriptionTransitions: Record<SubscriptionStatus, readonly SubscriptionStatus[]> = {
  DRAFT: ['QUOTATION'],
  QUOTATION: ['CONFIRMED'],
  CONFIRMED: ['ACTIVE'],
  ACTIVE: ['CLOSED'],
  CLOSED: [],
};

export const invoiceTransitions: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PAID', 'CANCELLED'],
  PAID: [],
  CANCELLED: [],
  OVERDUE: ['PAID', 'CANCELLED'],
};

export function canTransition<T extends string>(map: Record<T, readonly T[]>, from: T, to: T): boolean {
  return map[from].includes(to);
}
