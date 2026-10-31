export interface MonthlySnapshot {
  id: string;
  month: string;
  mrr: number | string;
  newMrr: number | string;
  expansionMrr: number | string;
  contractionMrr: number | string;
  churnedMrr: number | string;
  activeCount: number;
  newCount: number;
  churnedCount: number;
  revenueCollected: number | string;
  outstanding: number | string;
  overdue: number | string;
  createdAt: string;
}

export interface AnalyticsSummary {
  mrr: number;
  activeSubscriptions: number;
  revenueCollected: number;
  outstanding: number;
  overdueInvoices: number;
  churnRate: number;
}

export interface MrrMovement {
  month: string;
  startingMrr: number;
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnedMrr: number;
  endingMrr: number;
}

export interface ChurnMetric {
  period: string;
  customerChurnRate: number;
  revenueChurnRate: number;
  churnedCustomers: number;
}

export interface AgingReportItem {
  bucket: '0-30' | '31-60' | '61-90' | '90+';
  amount: number;
  invoiceCount: number;
}

export interface TopPlanMetric {
  planId: string;
  planName: string;
  subscriberCount: number;
  mrr: number;
  percentage: number;
}

