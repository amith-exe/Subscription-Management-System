'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  BarChart3,
  Layers,
  Building2,
  Calendar,
  Percent,
  Activity,
  Award
} from 'lucide-react';
import { BENTO } from '@/components/bento/styles';
import { formatCurrency } from '@/lib/utils';
import type { AnalyticsSummary, MrrMovement, AgingReportItem, TopPlanMetric } from '@/types/analytics';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

// Seed / Baseline snapshot metrics adhering directly to Brightloop's test dataset
const DEFAULT_SUMMARY: AnalyticsSummary = {
  mrr: 2160.0,
  activeSubscriptions: 4,
  revenueCollected: 2250.8,
  outstanding: 3041.0,
  overdueInvoices: 2,
  churnRate: 0.0,
};

const DEFAULT_MRR_WATERFALL: MrrMovement = {
  month: 'October 2026',
  startingMrr: 600.0,
  newMrr: 1060.0,
  expansionMrr: 500.0,
  contractionMrr: 0.0,
  churnedMrr: 0.0,
  endingMrr: 2160.0,
};

const DEFAULT_AGING_BUCKETS: AgingReportItem[] = [
  { bucket: '0-30', amount: 2891.0, invoiceCount: 2 },
  { bucket: '31-60', amount: 1180.0, invoiceCount: 1 },
  { bucket: '61-90', amount: 0.0, invoiceCount: 0 },
  { bucket: '90+', amount: 0.0, invoiceCount: 0 },
];

const DEFAULT_TOP_PLANS: TopPlanMetric[] = [
  { planId: 'p-1', planName: 'Professional Monthly', subscriberCount: 3, mrr: 1629.0, percentage: 75.4 },
  { planId: 'p-2', planName: 'Enterprise Annual', subscriberCount: 1, mrr: 531.0, percentage: 24.6 },
];

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary>(DEFAULT_SUMMARY);
  const [mrrWaterfall, setMrrWaterfall] = useState<MrrMovement>(DEFAULT_MRR_WATERFALL);
  const [agingBuckets, setAgingBuckets] = useState<AgingReportItem[]>(DEFAULT_AGING_BUCKETS);
  const [topPlans, setTopPlans] = useState<TopPlanMetric[]>(DEFAULT_TOP_PLANS);
  const [loading, setLoading] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, mrrRes, agingRes, plansRes] = await Promise.all([
        fetch(`${API_URL}/analytics/summary`, { cache: 'no-store' }),
        fetch(`${API_URL}/analytics/mrr-movement`, { cache: 'no-store' }),
        fetch(`${API_URL}/analytics/aging`, { cache: 'no-store' }),
        fetch(`${API_URL}/analytics/top-plans`, { cache: 'no-store' }),
      ]);

      if (sumRes.ok && mrrRes.ok && agingRes.ok) {
        const sumData = await sumRes.json();
        const mrrData = await mrrRes.json();
        const agingData = await agingRes.json();
        const plansData = plansRes.ok ? await plansRes.json() : DEFAULT_TOP_PLANS;

        setSummary(sumData.data || sumData);
        setMrrWaterfall(mrrData.data || mrrData);
        setAgingBuckets(agingData.data || agingData);
        setTopPlans(plansData.data || plansData);
        setApiConnected(true);
      } else {
        setApiConnected(false);
      }
    } catch {
      setApiConnected(false);
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  }, []);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const netMovement = mrrWaterfall.newMrr + mrrWaterfall.expansionMrr - mrrWaterfall.contractionMrr - mrrWaterfall.churnedMrr;

  const waterfallRows = [
    { label: 'Starting MRR', amount: mrrWaterfall.startingMrr, pct: 28, bar: 'bg-stone-500' },
    { label: 'New Business MRR (Odoo Deals)', amount: mrrWaterfall.newMrr, pct: 49, bar: 'bg-emerald-700' },
    { label: 'Expansion MRR (Storage Add-ons)', amount: mrrWaterfall.expansionMrr, pct: 23, bar: 'bg-teal-600' },
    { label: 'Contraction & Churned MRR', amount: mrrWaterfall.churnedMrr + mrrWaterfall.contractionMrr, pct: 0, bar: 'bg-rose-500' },
    { label: 'Ending Active MRR', amount: mrrWaterfall.endingMrr, pct: 100, bar: 'bg-stone-900' },
  ];

  return (
    <div className={`min-h-screen ${BENTO.pageBg}`}>
      {/* Swiss Neo-Bento Header */}
      <header className={`${BENTO.headerBg} px-8 lg:px-10 py-5 sticky top-0 z-40`}>
        <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-bold text-lg shadow-[2px_2px_0px_rgba(28,25,23,0.25)]">
              B
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700">
                  WORKSPACE: FINANCE & REVENUE
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${apiConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'}`}>
                  {apiConnected ? '● LIVE API' : '○ SEED SNAPSHOT'}
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight mt-0.5">
                Executive Recurring Revenue (MRR) & Receivables Aging
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-stone-500 hidden sm:inline">
              Refreshed: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={() => void fetchAnalytics()}
              disabled={loading}
              className={BENTO.secondaryBtn}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-200/80 hover:bg-stone-300 text-stone-800 text-xs font-semibold border-2 border-stone-900/15 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Operations
            </Link>
            <Link
              href="/portal"
              className={BENTO.primaryBtn}
            >
              <Building2 className="w-3.5 h-3.5" /> Customer Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1360px] mx-auto p-8 lg:p-10 space-y-8">
        {/* Top 4 Spacious KPI Bento Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className={`${BENTO.card} p-7`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-stone-500">Monthly Recurring (MRR)</span>
              <TrendingUp className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-3xl font-bold font-mono tabular-nums mt-3">
              {formatCurrency(summary.mrr)}
            </p>
            <p className="text-xs font-mono text-emerald-700 font-semibold mt-2">
              +{formatCurrency(netMovement)} Net Movement
            </p>
          </div>

          <div className={`${BENTO.card} p-7`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-stone-500">Revenue Collected</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-3xl font-bold font-mono tabular-nums mt-3">
              {formatCurrency(summary.revenueCollected)}
            </p>
            <p className="text-xs font-mono text-stone-500 mt-2">Settled via Card, UPI & Wire</p>
          </div>

          <div className={`${BENTO.card} p-7`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-stone-500">Outstanding Receivables</span>
              <Clock className="w-4 h-4 text-sky-700" />
            </div>
            <p className="text-3xl font-bold font-mono tabular-nums mt-3">
              {formatCurrency(summary.outstanding)}
            </p>
            <p className="text-xs font-mono text-stone-500 mt-2">
              Current (0–30d): {formatCurrency(agingBuckets[0]?.amount || 0)}
            </p>
          </div>

          <div className={`${BENTO.card} p-7 ${summary.overdueInvoices > 0 ? 'border-rose-500/70 bg-rose-50/20' : ''}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-mono uppercase font-bold ${summary.overdueInvoices > 0 ? 'text-rose-800' : 'text-stone-500'}`}>
                Overdue Invoices
              </span>
              <AlertTriangle className={`w-4 h-4 ${summary.overdueInvoices > 0 ? 'text-rose-600' : 'text-stone-400'}`} />
            </div>
            <p className={`text-3xl font-bold font-mono tabular-nums mt-3 ${summary.overdueInvoices > 0 ? 'text-rose-700' : 'text-stone-800'}`}>
              {summary.overdueInvoices}
            </p>
            <p className={`text-xs font-mono mt-2 ${summary.overdueInvoices > 0 ? 'text-rose-800 font-semibold' : 'text-stone-500'}`}>
              {summary.overdueInvoices > 0 ? 'Requires immediate chasing' : 'All invoices on schedule'}
            </p>
          </div>
        </div>

        {/* Major Grid: MRR Waterfall vs Receivables Aging */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* MRR Movement Waterfall */}
          <div className={`${BENTO.card} p-8 space-y-6`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">MRR Movement Waterfall</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Powered by pre-aggregated <code className="font-mono">MonthlySnapshot</code> (&lt;2s load target)
                </p>
              </div>
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-400">
                Net +{formatCurrency(netMovement)}
              </span>
            </div>

            <div className="space-y-4 pt-2">
              {waterfallRows.map((row, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-stone-700">{row.label}</span>
                    <span className="font-mono font-bold tabular-nums text-stone-900">
                      {formatCurrency(row.amount)}
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[#EAE8E1] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${row.bar}`}
                      style={{ width: `${Math.min(100, Math.max(2, row.pct))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Receivables Aging Buckets */}
          <div className={`${BENTO.card} p-8 space-y-6`}>
            <div>
              <h2 className="text-lg font-bold">Receivables Aging Buckets</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Unpaid <code className="font-mono">CONFIRMED</code> invoices grouped by days past due date
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              {agingBuckets.map((b, i) => {
                const isOverdue = b.bucket !== '0-30';
                const hasAmount = b.amount > 0;
                return (
                  <div
                    key={i}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      isOverdue && hasAmount
                        ? 'border-rose-500 bg-rose-50/70 text-rose-950 shadow-[2px_2px_0px_rgba(244,63,94,0.15)]'
                        : 'border-stone-900/15 bg-[#F4F3EF]/60 text-stone-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase font-bold">
                        {b.bucket === '0-30' ? '0 – 30 Days' : `${b.bucket} Days Overdue`}
                      </span>
                      {isOverdue && hasAmount && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                    </div>
                    <p className={`text-2xl font-bold font-mono tabular-nums mt-2 ${isOverdue && hasAmount ? 'text-rose-700' : ''}`}>
                      {formatCurrency(b.amount)}
                    </p>
                    <p className="text-xs font-mono text-stone-500 mt-1">
                      {b.invoiceCount} {b.invoiceCount === 1 ? 'Invoice' : 'Invoices'}{' '}
                      {b.bucket === '0-30' ? '(Current)' : 'Overdue'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Section: Top Contributing Plans */}
        <div className={`${BENTO.card} p-8 space-y-6`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Top Performing Plans</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Subscription distribution and Monthly Recurring Revenue contribution by plan.
              </p>
            </div>
            <Award className="w-5 h-5 text-emerald-700" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`text-[11px] font-mono uppercase ${BENTO.tableHeader}`}>
                  <th className="py-3.5 px-5">Plan Name</th>
                  <th className="py-3.5 px-5 text-right">Subscribers</th>
                  <th className="py-3.5 px-5 text-right">Monthly Revenue (MRR)</th>
                  <th className="py-3.5 px-5 text-right">Revenue Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-sm">
                {topPlans.map((plan) => (
                  <tr key={plan.planId} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-4 px-5 font-semibold text-stone-900">{plan.planName}</td>
                    <td className="py-4 px-5 text-right font-mono font-medium">{plan.subscriberCount}</td>
                    <td className="py-4 px-5 text-right font-mono font-bold tabular-nums">
                      {formatCurrency(plan.mrr)}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-400">
                        {plan.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

