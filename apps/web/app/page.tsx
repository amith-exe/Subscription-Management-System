'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Layers,
  FileText,
  BarChart3,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Search,
  Lock,
  Receipt,
  X,
  Sliders,
  Check,
  Building2,
  TrendingUp,
  Filter,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  DollarSign,
  ShieldCheck,
  Award
} from 'lucide-react';

// Deterministic currency formatter to guarantee 0 hydration discrepancy between SSR & Client
const formatINR = (amount: number | string | null | undefined): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
  const valid = isNaN(num) ? 0 : num;
  const parts = Math.abs(valid).toFixed(2).split('.');
  const intPart = parts[0];
  const decPart = parts[1];
  const lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);
  const formattedInt =
    otherNumbers !== ''
      ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
      : lastThree;
  const sign = valid < 0 ? '-' : '';
  return `${sign}₹${formattedInt}.${decPart}`;
};

// Swiss Neo-Bento Architectural Style Tokens
const BENTO = {
  card: 'bg-white rounded-xl border-2 border-stone-900/15 shadow-[4px_4px_0px_rgba(28,25,23,0.06)]',
  cardInteractive:
    'bg-white rounded-xl border-2 border-stone-900/15 shadow-[4px_4px_0px_rgba(28,25,23,0.06)] hover:border-stone-900/35 transition-all duration-150',
  modal: 'bg-white rounded-2xl border-2 border-stone-900 shadow-[8px_8px_0px_rgba(28,25,23,0.16)]',
  primaryBtn:
    'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold border border-stone-900/20 shadow-[2px_2px_0px_rgba(28,25,23,0.20)] active:translate-y-[1px] transition-all cursor-pointer',
  secondaryBtn:
    'inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-[#F4F3EF] hover:bg-stone-200/80 text-stone-800 text-xs font-semibold border-2 border-stone-900/15 transition-all cursor-pointer',
  tableHeader: 'bg-[#EAE8E1]/70 text-stone-600 border-b-2 border-stone-900/15',
  input:
    'px-3.5 py-2 rounded-xl bg-white border-2 border-stone-300 text-stone-900 text-xs placeholder:text-stone-400 focus:outline-none focus:border-emerald-700'
};

type WorkspaceRole = 'INTERNAL' | 'FINANCE' | 'ADMIN' | 'CUSTOMER';

const INITIAL_SUBSCRIPTIONS = [
  {
    id: 'sub-1',
    number: 'SUB-000001',
    customer: 'Acme Corporation',
    plan: 'Professional Monthly',
    period: 'MONTHLY',
    status: 'ACTIVE',
    startDate: '01 Sep 2026',
    nextBillingDate: '01 Nov 2026',
    terms: 'Net 30',
    productName: 'Brightloop ERP Platform',
    variantLabel: 'Brand: Odoo (+₹560.00)',
    qty: 1,
    unitPrice: 1060.0,
    taxAmount: 190.8,
    totalAmount: 1250.8
  },
  {
    id: 'sub-2',
    number: 'SUB-000002',
    customer: 'Globex Retail Corp',
    plan: 'Professional Monthly',
    period: 'MONTHLY',
    status: 'ACTIVE',
    startDate: '01 Sep 2026',
    nextBillingDate: '01 Nov 2026',
    terms: 'Net 15',
    productName: 'Brightloop ERP Platform',
    variantLabel: 'Brand: Standard',
    qty: 2,
    unitPrice: 500.0,
    taxAmount: 180.0,
    totalAmount: 1180.0
  },
  {
    id: 'sub-3',
    number: 'SUB-000003',
    customer: 'Initech Solutions',
    plan: 'Enterprise Annual',
    period: 'YEARLY',
    status: 'ACTIVE',
    startDate: '01 Oct 2026',
    nextBillingDate: '01 Oct 2027',
    terms: 'Net 30',
    productName: 'Brightloop ERP Platform',
    variantLabel: 'Standard (4 Seats)',
    qty: 4,
    unitPrice: 500.0,
    taxAmount: 360.0,
    totalAmount: 2360.0
  },
  {
    id: 'sub-4',
    number: 'SUB-000004',
    customer: 'Acme Corporation',
    plan: 'Professional Monthly',
    period: 'MONTHLY',
    status: 'ACTIVE',
    startDate: '01 Oct 2026',
    nextBillingDate: '01 Nov 2026',
    terms: 'Due on Receipt',
    productName: 'Cloud Storage 1TB Add-on',
    variantLabel: 'PROMO10 (-10% Off)',
    qty: 10,
    unitPrice: 50.0,
    taxAmount: 81.0,
    totalAmount: 531.0
  },
  {
    id: 'sub-5',
    number: 'SUB-000005',
    customer: 'Globex Retail Corp',
    plan: 'Enterprise Annual',
    period: 'YEARLY',
    status: 'QUOTATION',
    startDate: '01 Nov 2026',
    nextBillingDate: '—',
    terms: 'Net 30',
    productName: 'Brightloop ERP Platform',
    variantLabel: 'Brand: Odoo (+₹560.00)',
    qty: 3,
    unitPrice: 1060.0,
    taxAmount: 572.4,
    totalAmount: 3752.4
  }
];

const INITIAL_INVOICES = [
  {
    id: 'inv-1',
    number: 'INV-000001',
    subNumber: 'SUB-000001',
    customer: 'Acme Corporation',
    taxId: 'US-TAX-882190',
    period: '01 Sep 2026 → 30 Sep 2026',
    issueDate: '01 Sep 2026',
    dueDate: '01 Oct 2026',
    subtotal: 1060.0,
    discount: 0.0,
    tax: 190.8,
    total: 1250.8,
    paid: 1250.8,
    status: 'PAID',
    isOverdue: false,
    lineDescription: 'Brightloop ERP Platform (Brand: Odoo)',
    qty: 1,
    unitPrice: 1060.0,
    paymentNote: 'CARD • STRIPE-TXN-9918231'
  },
  {
    id: 'inv-2',
    number: 'INV-000002',
    subNumber: 'SUB-000002',
    customer: 'Globex Retail Corp',
    taxId: 'US-TAX-441209',
    period: '15 Sep 2026 → 14 Oct 2026',
    issueDate: '15 Sep 2026',
    dueDate: '30 Sep 2026',
    subtotal: 1000.0,
    discount: 0.0,
    tax: 180.0,
    total: 1180.0,
    paid: 0.0,
    status: 'CONFIRMED',
    isOverdue: true,
    lineDescription: 'Brightloop ERP Platform (Brand: Standard) × 2',
    qty: 2,
    unitPrice: 500.0,
    paymentNote: '31 Days Past Due'
  },
  {
    id: 'inv-3',
    number: 'INV-000003',
    subNumber: 'SUB-000003',
    customer: 'Initech Solutions',
    taxId: 'US-TAX-998811',
    period: '01 Oct 2026 → 30 Sep 2027',
    issueDate: '01 Oct 2026',
    dueDate: '31 Oct 2026',
    subtotal: 2000.0,
    discount: 0.0,
    tax: 360.0,
    total: 2360.0,
    paid: 1000.0,
    status: 'CONFIRMED',
    isOverdue: false,
    lineDescription: 'Annual License ERP Enterprise (4 Seats)',
    qty: 4,
    unitPrice: 500.0,
    paymentNote: 'BANK_TRANSFER • WIRE-88127 (Partial)'
  },
  {
    id: 'inv-4',
    number: 'INV-000004',
    subNumber: 'SUB-000004',
    customer: 'Acme Corporation',
    taxId: 'US-TAX-882190',
    period: '01 Oct 2026 → 31 Oct 2026',
    issueDate: '01 Oct 2026',
    dueDate: '05 Oct 2026',
    subtotal: 500.0,
    discount: 50.0,
    tax: 81.0,
    total: 531.0,
    paid: 0.0,
    status: 'CONFIRMED',
    isOverdue: true,
    lineDescription: 'Cloud Storage 1TB Add-on × 10 (PROMO10 -10%)',
    qty: 10,
    unitPrice: 50.0,
    paymentNote: '26 Days Past Due'
  }
];

const LIFECYCLE_STEPS = [
  { state: 'DRAFT', label: 'Draft Quote' },
  { state: 'QUOTATION', label: 'Sent Quotation' },
  { state: 'CONFIRMED', label: 'Confirmed Order' },
  { state: 'ACTIVE', label: 'Active Billing' },
  { state: 'CLOSED', label: 'Closed / Ended' }
];

function StatusBadge({ status, isOverdue }: { status: string; isOverdue?: boolean }) {
  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-100 text-rose-900 border-2 border-rose-500">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
        OVERDUE
      </span>
    );
  }

  const styles: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-900 border border-emerald-400',
    PAID: 'bg-emerald-100 text-emerald-900 border border-emerald-400',
    CONFIRMED: 'bg-sky-100 text-sky-900 border border-sky-400',
    QUOTATION: 'bg-amber-100 text-amber-900 border border-amber-400',
    DRAFT: 'bg-stone-200 text-stone-700 border border-stone-400',
    CLOSED: 'bg-zinc-100 text-zinc-500 border border-zinc-300'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold ${
        styles[status] || styles.DRAFT
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export default function HomePage() {
  const [activePersona, setActivePersona] = useState<WorkspaceRole>('INTERNAL');
  const [staffSection, setStaffSection] = useState<'SUBSCRIPTIONS' | 'INVOICES'>('SUBSCRIPTIONS');
  const [subscriptions, setSubscriptions] = useState(INITIAL_SUBSCRIPTIONS);
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);
  const [selectedLifecycle, setSelectedLifecycle] = useState('ALL');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Admin Config State
  const [selectedVariant, setSelectedVariant] = useState('odoo');
  const [monthlyAllowEarlyClose, setMonthlyAllowEarlyClose] = useState(true);
  const [autoClosePlan, setAutoClosePlan] = useState(false);
  const [allowPausePlan, setAllowPausePlan] = useState(true);

  // Modals & Feedback
  const [pdfModalInvoice, setPdfModalInvoice] = useState<any>(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('UPI-99481023');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const matchesState = selectedLifecycle === 'ALL' || sub.status === selectedLifecycle;
      const matchesSearch =
        sub.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.customer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesState && matchesSearch;
    });
  }, [subscriptions, selectedLifecycle, searchQuery]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (overdueOnly && !inv.isOverdue) return false;
      if (!searchQuery) return true;
      return (
        inv.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customer.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [invoices, overdueOnly, searchQuery]);

  const handleAdvanceSubscription = (id: string) => {
    const order = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED'];
    setSubscriptions((prev) =>
      prev.map((sub) => {
        if (sub.id !== id) return sub;
        const idx = order.indexOf(sub.status);
        const nextStatus = idx < order.length - 1 ? order[idx + 1] : sub.status;
        triggerToast(`Transitioned ${sub.number}: ${sub.status} → ${nextStatus}`);
        return {
          ...sub,
          status: nextStatus,
          nextBillingDate: nextStatus === 'ACTIVE' ? '01 Dec 2026' : sub.nextBillingDate
        };
      })
    );
  };

  const handleOpenPaymentModal = (inv: any) => {
    const remaining = Math.max(0, inv.total - inv.paid);
    setPaymentModalInvoice(inv);
    setPaymentAmount(remaining.toFixed(2));
    setPaymentMethod('UPI');
    setPaymentRef(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;
    const paidInput = parseFloat(paymentAmount) || 0;
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== paymentModalInvoice.id) return inv;
        const updatedPaid = Math.min(inv.total, inv.paid + paidInput);
        const isNowSettled = updatedPaid >= inv.total;
        return {
          ...inv,
          paid: updatedPaid,
          status: isNowSettled ? 'PAID' : inv.status,
          isOverdue: isNowSettled ? false : inv.isOverdue,
          paymentNote: `${paymentMethod} • ${paymentRef}`
        };
      })
    );
    triggerToast(`Logged ${formatINR(paidInput)} (${paymentMethod}) for ${paymentModalInvoice.number}`);
    setPaymentModalInvoice(null);
  };

  const basePrice = 500;
  const extraPrice = selectedVariant === 'odoo' ? 560 : 0;
  const unitPrice = basePrice + extraPrice;

  const totalOutstanding = useMemo(() => {
    return invoices.reduce((sum, i) => sum + (i.total - i.paid), 0);
  }, [invoices]);

  const totalOverdue = useMemo(() => {
    return invoices
      .filter((i) => i.isOverdue)
      .reduce((sum, i) => sum + (i.total - i.paid), 0);
  }, [invoices]);

  const totalCollected = useMemo(() => {
    return invoices.reduce((sum, i) => sum + i.paid, 0);
  }, [invoices]);

  return (
    <div className="min-h-screen bg-[#F4F3EF] text-stone-950 font-sans">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-xl bg-stone-900 text-stone-50 font-semibold text-xs shadow-xl border-2 border-emerald-500">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* FULL ARCHITECTURAL BACK-OFFICE SHELL */}
      <div className="flex min-h-screen">
        {/* Architectural Left Sidebar (Exact Match Image 1) */}
        <aside className="w-64 min-w-[16rem] shrink-0 bg-[#EAE8E1] border-r-2 border-stone-900/15 p-6 flex flex-col justify-between min-h-screen sticky top-0 h-screen overflow-y-auto">
          <div className="space-y-8">
            {/* Top Brand Logo */}
            <div className="flex items-center gap-3 px-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-black text-lg shadow-[2px_2px_0px_rgba(28,25,23,0.25)]">
                B
              </div>
              <div>
                <h1 className="font-bold tracking-tight text-base text-stone-950">Brightloop ERP</h1>
                <p className="text-[11px] font-mono text-stone-600">Swiss Neo-Bento UI</p>
              </div>
            </div>

            {/* Role Workspaces Navigation */}
            <div className="space-y-1.5">
              <p className="px-3 text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-2 font-bold">
                ROLE WORKSPACES
              </p>
              {[
                { icon: Layers, label: 'Staff Operations', id: 'INTERNAL' as WorkspaceRole },
                { icon: BarChart3, label: 'Finance & MRR', id: 'FINANCE' as WorkspaceRole },
                { icon: Package, label: 'Admin Governance', id: 'ADMIN' as WorkspaceRole },
                { icon: Building2, label: 'Customer Portal', id: 'CUSTOMER' as WorkspaceRole }
              ].map((nav) => {
                const isActive = activePersona === nav.id;
                const Icon = nav.icon;
                return (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => {
                      setActivePersona(nav.id);
                      setSearchQuery('');
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-stone-950 border-2 border-stone-900/20 shadow-[2px_2px_0px_rgba(28,25,23,0.08)]'
                        : 'text-stone-700 hover:bg-stone-300/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-stone-600'}`} />
                    <span>{nav.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clean Enterprise Footer (Production Grade) */}
          <div className="pt-6 border-t border-stone-300/60 space-y-2 font-mono text-[11px] text-stone-600">
            <div className="flex items-center justify-between">
              <span>DB: PostgreSQL 16</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse" />
                Live Node
              </span>
            </div>
            <div className="text-[10px] text-stone-500">
              Brightloop Enterprise v1.0.0
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#F4F3EF]">
          <header className="bg-[#F4F3EF]/95 backdrop-blur-md border-b-2 border-stone-900/15 px-8 lg:px-10 py-5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700">
                ACTIVE WORKSPACE: {activePersona}
              </span>
              <h2 className="text-xl font-bold tracking-tight mt-0.5 text-stone-950">
                {activePersona === 'INTERNAL' && 'Sales Quotations, Lifecycle & Overdue Recovery'}
                {activePersona === 'FINANCE' && 'Executive Recurring Revenue (MRR) & Receivables Aging'}
                {activePersona === 'ADMIN' && 'Product Variants, Pricing & Plan Policy Governance'}
                {activePersona === 'CUSTOMER' && 'Customer Self-Service Portal (Tenant View: Acme Corp)'}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {activePersona === 'INTERNAL' && (
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search SUB-000001, Globex..."
                    className="pl-9 pr-4 py-2 rounded-xl bg-white border-2 border-stone-300 text-stone-900 text-xs placeholder:text-stone-400 focus:outline-none focus:border-emerald-700 w-64 transition-colors font-sans"
                  />
                </div>
              )}

              {activePersona === 'CUSTOMER' && (
                <Link
                  href="/portal"
                  target="_blank"
                  className={BENTO.secondaryBtn}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Dedicated Portal Tab
                </Link>
              )}

              {activePersona === 'FINANCE' && (
                <Link
                  href="/analytics"
                  target="_blank"
                  className={BENTO.secondaryBtn}
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Deep Analytics Tab
                </Link>
              )}
            </div>
          </header>

          <main className="p-8 lg:p-10 space-y-8 max-w-[1360px] w-full">
            {/* 1. INTERNAL / STAFF OPERATIONS WORKSPACE (EXACT MATCH IMAGE 1) */}
            {activePersona === 'INTERNAL' && (
              <div className="space-y-8">
                {/* 4 Spacious KPI Bento Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className={`${BENTO.card} p-7`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase text-stone-500 font-semibold">MONTHLY RECURRING (MRR)</span>
                      <TrendingUp className="w-4 h-4 text-emerald-700" />
                    </div>
                    <p className="text-3xl font-bold font-mono tabular-nums mt-3 text-stone-900">{formatINR(2160.0)}</p>
                    <p className="text-xs font-mono text-emerald-700 font-semibold mt-2">
                      +{formatINR(1560.0)} Net Movement
                    </p>
                  </div>

                  <div className={`${BENTO.card} p-7`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase text-stone-500 font-semibold">REVENUE COLLECTED</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    </div>
                    <p className="text-3xl font-bold font-mono tabular-nums mt-3 text-stone-900">
                      {formatINR(totalCollected)}
                    </p>
                    <p className="text-xs font-mono text-stone-500 mt-2">Settled via Card & Wire</p>
                  </div>

                  <div className={`${BENTO.card} p-7`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase text-stone-500 font-semibold">OUTSTANDING RECEIVABLES</span>
                      <Clock className="w-4 h-4 text-sky-700" />
                    </div>
                    <p className="text-3xl font-bold font-mono tabular-nums mt-3 text-stone-900">
                      {formatINR(totalOutstanding)}
                    </p>
                    <p className="text-xs font-mono text-stone-500 mt-2">0–30d Current: {formatINR(2891.0)}</p>
                  </div>

                  <div className={`${BENTO.card} p-7 border-rose-500/60`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase font-bold text-rose-800">OVERDUE INVOICES</span>
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    </div>
                    <p className="text-3xl font-bold font-mono tabular-nums text-rose-700 mt-3">
                      {formatINR(totalOverdue)}
                    </p>
                    <p className="text-xs font-mono text-rose-800 mt-2">
                      {invoices.filter((i) => i.isOverdue).length} Confirmed Bills Past Due
                    </p>
                  </div>
                </div>

                {/* Subscription Lifecycle State Machine Bento Module */}
                <div className={`${BENTO.card} p-7 space-y-5`}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-stone-900">Subscription Lifecycle State Machine</h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Click any stage to filter subscriptions. Transitions follow{' '}
                        <code className="font-mono">DRAFT → QUOTATION → CONFIRMED → ACTIVE → CLOSED</code>.
                      </p>
                    </div>
                    {selectedLifecycle !== 'ALL' && (
                      <button onClick={() => setSelectedLifecycle('ALL')} className={BENTO.secondaryBtn}>
                        Show All Stages
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                    {LIFECYCLE_STEPS.map((step, i) => {
                      const isSelected = selectedLifecycle === step.state;
                      const count = subscriptions.filter((s) => s.status === step.state).length;
                      return (
                        <button
                          key={step.state}
                          type="button"
                          onClick={() =>
                            setSelectedLifecycle(selectedLifecycle === step.state ? 'ALL' : step.state)
                          }
                          className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-700 shadow-[2px_2px_0px_rgba(4,120,87,0.2)]'
                              : 'bg-[#F4F3EF]/60 border-stone-900/15 hover:border-stone-900/35'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-mono text-stone-500">
                            <span>STEP 0{i + 1}</span>
                            <span className="px-2 py-0.5 rounded bg-white border border-stone-300 text-stone-800 font-bold">
                              {count}
                            </span>
                          </div>
                          <p className="font-mono font-bold text-sm mt-2 text-stone-900">{step.state}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{step.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subscriptions vs Invoices Module Switcher */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStaffSection('SUBSCRIPTIONS')}
                    className={staffSection === 'SUBSCRIPTIONS' ? BENTO.primaryBtn : BENTO.secondaryBtn}
                  >
                    <Layers className="w-4 h-4" /> Subscriptions Pipeline ({filteredSubscriptions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffSection('INVOICES')}
                    className={staffSection === 'INVOICES' ? BENTO.primaryBtn : BENTO.secondaryBtn}
                  >
                    <Receipt className="w-4 h-4" /> Invoices & Overdue Queue ({filteredInvoices.length})
                  </button>
                </div>

                {staffSection === 'SUBSCRIPTIONS' ? (
                  <div className={`${BENTO.card} p-8 space-y-5`}>
                    <div>
                      <h3 className="text-lg font-bold text-stone-900">Subscriptions & Quotation Pipeline</h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Unit prices freeze product base price + variant extraPrice (e.g. Odoo adds +₹560.00).
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={`text-[11px] font-mono uppercase ${BENTO.tableHeader}`}>
                            <th className="py-3.5 px-5">Subscription #</th>
                            <th className="py-3.5 px-5">Customer</th>
                            <th className="py-3.5 px-5">Plan & Next Bill</th>
                            <th className="py-3.5 px-5">Product & Variant</th>
                            <th className="py-3.5 px-5 text-right">Qty × Unit</th>
                            <th className="py-3.5 px-5 text-right">Total (Incl. Tax)</th>
                            <th className="py-3.5 px-5">Status</th>
                            <th className="py-3.5 px-5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 text-sm">
                          {filteredSubscriptions.map((sub) => (
                            <tr key={sub.id} className="hover:bg-stone-50/80">
                              <td className="py-4 px-5 font-mono font-bold text-stone-900">{sub.number}</td>
                              <td className="py-4 px-5">
                                <p className="font-semibold text-stone-900">{sub.customer}</p>
                                <p className="text-xs font-mono text-stone-500">{sub.terms}</p>
                              </td>
                              <td className="py-4 px-5">
                                <p className="font-medium text-xs text-stone-800">{sub.plan}</p>
                                <p className="text-xs font-mono text-stone-500">Next: {sub.nextBillingDate}</p>
                              </td>
                              <td className="py-4 px-5">
                                <p className="font-medium text-xs text-stone-800">{sub.productName}</p>
                                <p className="text-xs font-mono text-emerald-700">{sub.variantLabel}</p>
                              </td>
                              <td className="py-4 px-5 text-right font-mono tabular-nums text-xs text-stone-700">
                                {sub.qty} × {formatINR(sub.unitPrice)}
                              </td>
                              <td className="py-4 px-5 text-right font-mono font-bold tabular-nums text-stone-900">
                                {formatINR(sub.totalAmount)}
                              </td>
                              <td className="py-4 px-5">
                                <StatusBadge status={sub.status} />
                              </td>
                              <td className="py-4 px-5 text-right">
                                {sub.status !== 'CLOSED' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleAdvanceSubscription(sub.id)}
                                    className={BENTO.secondaryBtn}
                                  >
                                    Advance State →
                                  </button>
                                ) : (
                                  <span className="text-xs font-mono text-stone-400">Closed</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className={`${BENTO.card} p-8 space-y-5`}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-stone-900">Invoices & Overdue Recovery Queue</h3>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Overdue is computed dynamically when status is CONFIRMED and dueDate has passed.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOverdueOnly(!overdueOnly)}
                        className={overdueOnly ? BENTO.primaryBtn : BENTO.secondaryBtn}
                      >
                        <Filter className="w-3.5 h-3.5" />
                        {overdueOnly ? 'Showing Overdue Only' : 'Filter Overdue Only'}
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={`text-[11px] font-mono uppercase ${BENTO.tableHeader}`}>
                            <th className="py-3.5 px-5">Invoice #</th>
                            <th className="py-3.5 px-5">Customer</th>
                            <th className="py-3.5 px-5">Due Date</th>
                            <th className="py-3.5 px-5 text-right">Total</th>
                            <th className="py-3.5 px-5 text-right">Paid</th>
                            <th className="py-3.5 px-5">Status</th>
                            <th className="py-3.5 px-5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 text-sm">
                          {filteredInvoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-stone-50/80">
                              <td className="py-4 px-5 font-mono font-bold text-stone-900">{inv.number}</td>
                              <td className="py-4 px-5">
                                <p className="font-semibold text-stone-900">{inv.customer}</p>
                                <p className="text-xs font-mono text-stone-500">{inv.paymentNote}</p>
                              </td>
                              <td className="py-4 px-5 font-mono text-xs">
                                <span className={inv.isOverdue ? 'text-rose-700 font-bold' : 'text-stone-700'}>
                                  {inv.dueDate}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-right font-mono font-bold tabular-nums text-stone-900">
                                {formatINR(inv.total)}
                              </td>
                              <td className="py-4 px-5 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                                {formatINR(inv.paid)}
                              </td>
                              <td className="py-4 px-5">
                                <StatusBadge status={inv.status} isOverdue={inv.isOverdue} />
                              </td>
                              <td className="py-4 px-5 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPdfModalInvoice(inv)}
                                    className={BENTO.secondaryBtn}
                                  >
                                    PDF
                                  </button>
                                  {inv.status !== 'PAID' && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPaymentModal(inv)}
                                      className={BENTO.primaryBtn}
                                    >
                                      + Log Payment
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. FINANCE & MRR WORKSPACE */}
            {activePersona === 'FINANCE' && (
              <div className="space-y-8">
                {/* Finance Metric Tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className={`${BENTO.card} p-7`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase text-stone-500 font-semibold">Current MRR</span>
                      <TrendingUp className="w-4 h-4 text-emerald-700" />
                    </div>
                    <p className="text-3xl font-bold font-mono tabular-nums mt-3 text-stone-900">{formatINR(2160.0)}</p>
                    <p className="text-xs font-mono text-emerald-700 font-semibold mt-2">+₹1,560.00 Net Velocity</p>
                  </div>

                  <div className={`${BENTO.card} p-7`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase text-stone-500 font-semibold">Annual Run Rate (ARR)</span>
                      <DollarSign className="w-4 h-4 text-emerald-700" />
                    </div>
                    <p className="text-3xl font-bold font-mono tabular-nums mt-3 text-stone-900">{formatINR(25920.0)}</p>
                    <p className="text-xs font-mono text-stone-500 mt-2">12 × Active MRR</p>
                  </div>

                  <div className={`${BENTO.card} p-7`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase text-stone-500 font-semibold">Total Settled Cash</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    </div>
                    <p className="text-3xl font-bold font-mono tabular-nums mt-3 text-stone-900">{formatINR(totalCollected)}</p>
                    <p className="text-xs font-mono text-stone-500 mt-2">4 Settled Transactions</p>
                  </div>

                  <div className={`${BENTO.card} p-7 border-rose-500/60`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase font-bold text-rose-800">Unpaid Overdue</span>
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    </div>
                    <p className="text-3xl font-bold font-mono tabular-nums text-rose-700 mt-3">{formatINR(totalOverdue)}</p>
                    <p className="text-xs font-mono text-rose-800 mt-2">Requires recovery outreach</p>
                  </div>
                </div>

                {/* MRR Waterfall & Aging Buckets */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className={`${BENTO.card} p-8 space-y-6`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-stone-900">MRR Movement Waterfall</h3>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Powered by pre-aggregated MonthlySnapshot table (&lt;2s query target)
                        </p>
                      </div>
                      <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-400">
                        Net +₹1,560.00
                      </span>
                    </div>

                    <div className="space-y-4 pt-1">
                      {[
                        { label: 'Starting MRR (Previous Month)', amount: 600.0, pct: '28%', bar: 'bg-stone-500' },
                        { label: 'New Business MRR (Odoo Deals)', amount: 1060.0, pct: '50%', bar: 'bg-emerald-700' },
                        { label: 'Expansion MRR (Cloud Storage Add-ons)', amount: 500.0, pct: '24%', bar: 'bg-teal-600' },
                        { label: 'Churned & Cancelled MRR', amount: 0.0, pct: '2%', bar: 'bg-rose-500' },
                        { label: 'Ending Active MRR', amount: 2160.0, pct: '100%', bar: 'bg-stone-900' }
                      ].map((row, idx) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-stone-700">{row.label}</span>
                            <span className="font-mono font-bold tabular-nums text-stone-900">{formatINR(row.amount)}</span>
                          </div>
                          <div className="w-full h-3 rounded-full bg-[#EAE8E1] overflow-hidden">
                            <div className={`h-full rounded-full ${row.bar}`} style={{ width: row.pct }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`${BENTO.card} p-8 space-y-6`}>
                    <div>
                      <h3 className="text-lg font-bold text-stone-900">Receivables Aging Buckets</h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Unpaid CONFIRMED invoices grouped by days past dueDate
                      </p>
                    </div>

                    <div className="space-y-4 pt-1">
                      {[
                        { bucket: '0–30 Days (Current)', amount: 2891.0, count: 2, status: 'Healthy', color: 'text-emerald-800 bg-emerald-50 border-emerald-300' },
                        { bucket: '31–60 Days', amount: 1180.0, count: 1, status: 'Overdue Alert', color: 'text-amber-800 bg-amber-50 border-amber-300' },
                        { bucket: '61–90 Days', amount: 531.0, count: 1, status: 'Recovery Required', color: 'text-rose-800 bg-rose-50 border-rose-300' },
                        { bucket: '91+ Days (Doubtful)', amount: 0.0, count: 0, status: 'Zero Delinquency', color: 'text-stone-600 bg-stone-100 border-stone-200' }
                      ].map((b, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-[#F4F3EF] border-2 border-stone-900/10 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-sm text-stone-900">{b.bucket}</span>
                            <p className="text-xs font-mono text-stone-500">{b.count} Pending Bills</p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-base tabular-nums text-stone-900">
                              {formatINR(b.amount)}
                            </span>
                            <div className="mt-1">
                              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${b.color}`}>
                                {b.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Plan Revenue Breakdown */}
                <div className={`${BENTO.card} p-8 space-y-5`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-stone-900">Revenue Contribution by Plan</h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Real-time revenue concentration across active recurring subscriptions
                      </p>
                    </div>
                    <Award className="w-5 h-5 text-emerald-700" />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={`text-[11px] font-mono uppercase ${BENTO.tableHeader}`}>
                          <th className="py-3.5 px-5">Plan</th>
                          <th className="py-3.5 px-5">Billing Frequency</th>
                          <th className="py-3.5 px-5 text-right">Subscribers</th>
                          <th className="py-3.5 px-5 text-right">Monthly Revenue</th>
                          <th className="py-3.5 px-5 text-right">Revenue Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 text-sm">
                        <tr className="hover:bg-stone-50">
                          <td className="py-4 px-5 font-semibold text-stone-900">Professional Monthly</td>
                          <td className="py-4 px-5 font-mono text-xs text-stone-600">MONTHLY</td>
                          <td className="py-4 px-5 text-right font-mono font-medium">3 Subscribers</td>
                          <td className="py-4 px-5 text-right font-mono font-bold tabular-nums text-stone-900">{formatINR(1629.0)}</td>
                          <td className="py-4 px-5 text-right font-mono text-emerald-700 font-bold">75.4%</td>
                        </tr>
                        <tr className="hover:bg-stone-50">
                          <td className="py-4 px-5 font-semibold text-stone-900">Enterprise Annual</td>
                          <td className="py-4 px-5 font-mono text-xs text-stone-600">YEARLY</td>
                          <td className="py-4 px-5 text-right font-mono font-medium">1 Subscriber</td>
                          <td className="py-4 px-5 text-right font-mono font-bold tabular-nums text-stone-900">{formatINR(531.0)}</td>
                          <td className="py-4 px-5 text-right font-mono text-emerald-700 font-bold">24.6%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3. ADMIN GOVERNANCE WORKSPACE */}
            {activePersona === 'ADMIN' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Variant Pricing Sandbox */}
                <div className={`${BENTO.card} p-8 space-y-6`}>
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">Product & Additive Variant Pricing</h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Formula: <code className="font-mono">Unit Price = salesPrice + extraPrice</code>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedVariant('odoo')}
                      className={`p-5 rounded-xl border-2 text-left cursor-pointer transition-all ${
                        selectedVariant === 'odoo'
                          ? 'border-emerald-700 bg-emerald-50/70 shadow-[2px_2px_0px_rgba(4,120,87,0.2)]'
                          : 'border-stone-900/15 bg-[#F4F3EF]/50 hover:border-stone-900/35'
                      }`}
                    >
                      <span className="text-xs font-mono uppercase text-stone-500 font-semibold">Brand Variant</span>
                      <p className="font-bold text-base mt-1 text-stone-900">Odoo Edition</p>
                      <p className="font-mono text-xs text-emerald-700 font-bold mt-1">+₹560.00 extraPrice</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedVariant('standard')}
                      className={`p-5 rounded-xl border-2 text-left cursor-pointer transition-all ${
                        selectedVariant === 'standard'
                          ? 'border-emerald-700 bg-emerald-50/70 shadow-[2px_2px_0px_rgba(4,120,87,0.2)]'
                          : 'border-stone-900/15 bg-[#F4F3EF]/50 hover:border-stone-900/35'
                      }`}
                    >
                      <span className="text-xs font-mono uppercase text-stone-500 font-semibold">Brand Variant</span>
                      <p className="font-bold text-base mt-1 text-stone-900">Standard Edition</p>
                      <p className="font-mono text-xs text-stone-600 mt-1">+₹0.00 extraPrice</p>
                    </button>
                  </div>

                  <div className="p-5 rounded-xl bg-[#F4F3EF] border-2 border-stone-900/15 space-y-2.5 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-600">Base Product (Brightloop ERP):</span>
                      <span className="text-stone-900">{formatINR(basePrice)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Variant Add-on ({selectedVariant.toUpperCase()}):</span>
                      <span>+{formatINR(extraPrice)}</span>
                    </div>
                    <div className="border-t border-stone-300 pt-2.5 flex justify-between text-sm font-bold text-stone-900">
                      <span>Frozen Unit Price (Stored on Line):</span>
                      <span>{formatINR(unitPrice)}</span>
                    </div>
                  </div>
                </div>

                {/* Plan Policy Flags */}
                <div className={`${BENTO.card} p-8 space-y-6`}>
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">Plan Governance Policies</h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Enforces subscription behavior across the lifecycle state machine
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-5 rounded-xl bg-[#F4F3EF] border-2 border-stone-900/15 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-sm text-stone-900">allowEarlyClose</p>
                        <p className="text-xs text-stone-600 mt-0.5">
                          Allows customer to cancel contract before formal expiration date
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMonthlyAllowEarlyClose(!monthlyAllowEarlyClose);
                          triggerToast(`Updated allowEarlyClose to ${!monthlyAllowEarlyClose}`);
                        }}
                        className={monthlyAllowEarlyClose ? BENTO.primaryBtn : BENTO.secondaryBtn}
                      >
                        {monthlyAllowEarlyClose ? 'ENABLED' : 'LOCKED'}
                      </button>
                    </div>

                    <div className="p-5 rounded-xl bg-[#F4F3EF] border-2 border-stone-900/15 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-sm text-stone-900">allowPause</p>
                        <p className="text-xs text-stone-600 mt-0.5">
                          Permits customer to pause billing cycles without cancelling
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAllowPausePlan(!allowPausePlan);
                          triggerToast(`Updated allowPause to ${!allowPausePlan}`);
                        }}
                        className={allowPausePlan ? BENTO.primaryBtn : BENTO.secondaryBtn}
                      >
                        {allowPausePlan ? 'ENABLED' : 'LOCKED'}
                      </button>
                    </div>

                    <div className="p-5 rounded-xl bg-[#F4F3EF] border-2 border-stone-900/15 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-sm text-stone-900">autoClose</p>
                        <p className="text-xs text-stone-600 mt-0.5">
                          Automatically closes subscriptions when endDate is passed
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAutoClosePlan(!autoClosePlan);
                          triggerToast(`Updated autoClose to ${!autoClosePlan}`);
                        }}
                        className={autoClosePlan ? BENTO.primaryBtn : BENTO.secondaryBtn}
                      >
                        {autoClosePlan ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. CUSTOMER PORTAL SIMULATION IN INTERNAL SHELL */}
            {activePersona === 'CUSTOMER' && (
              <div className="space-y-8">
                {/* Tenant Identification Banner */}
                <div className={`${BENTO.card} p-6 flex flex-wrap items-center justify-between gap-4 bg-emerald-50/50 border-emerald-600/40`}>
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-base shadow-[2px_2px_0px_rgba(28,25,23,0.25)]">
                      A
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-stone-900">Acme Corporation</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-400">
                          Active Tenant
                        </span>
                      </div>
                      <p className="text-xs font-mono text-stone-600 mt-0.5">
                        billing@acme.com • Tax ID: US-TAX-882190
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 rounded-xl bg-white border-2 border-stone-900/15 text-xs font-mono flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      Isolated Tenant Context
                    </span>
                  </div>
                </div>

                {/* 3 Tenant KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className={`${BENTO.card} p-7`}>
                    <span className="text-xs font-mono uppercase tracking-wider text-stone-500 font-semibold">Active Subscribed Plans</span>
                    <p className="text-3xl font-bold font-mono tabular-nums mt-3 text-stone-900">2</p>
                    <p className="text-xs text-stone-600 mt-2">Next renewal: 01 Nov 2026</p>
                  </div>

                  <div className={`${BENTO.card} p-7`}>
                    <span className="text-xs font-mono uppercase tracking-wider text-stone-500 font-semibold">Monthly Commitment</span>
                    <p className="text-3xl font-bold font-mono tabular-nums mt-3 text-stone-900">{formatINR(1781.8)}</p>
                    <p className="text-xs text-stone-600 mt-2">Includes Odoo Variant & PROMO10</p>
                  </div>

                  <div className={`${BENTO.card} p-7 border-rose-500/60`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase tracking-wider text-rose-700 font-bold">
                        Unpaid Due Balance
                      </span>
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    </div>
                    <p className="text-3xl font-bold font-mono tabular-nums text-rose-700 mt-3">{formatINR(531.0)}</p>
                    <p className="text-xs text-stone-600 mt-2">INV-000004 due 05 Oct 2026</p>
                  </div>
                </div>

                {/* Tenant Subscriptions List */}
                <div className={`${BENTO.card} p-8 space-y-5`}>
                  <h3 className="text-lg font-bold text-stone-900">My Subscriptions</h3>
                  <div className="space-y-4">
                    {subscriptions
                      .filter((s) => s.customer === 'Acme Corporation')
                      .map((sub) => (
                        <div
                          key={sub.id}
                          className="p-6 rounded-xl bg-[#F4F3EF]/60 border-2 border-stone-900/12 flex flex-col md:flex-row md:items-center justify-between gap-6"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-sm text-stone-900">{sub.number}</span>
                              <StatusBadge status={sub.status} />
                              <span className="text-xs font-mono text-stone-600">{sub.plan}</span>
                            </div>
                            <p className="text-base font-bold text-stone-900">
                              {sub.productName}{' '}
                              <span className="font-mono text-xs font-normal text-emerald-800">({sub.variantLabel})</span>
                            </p>
                            <p className="text-xs font-mono text-stone-500">
                              Next Billing: {sub.nextBillingDate} • Payment Terms: {sub.terms}
                            </p>
                          </div>

                          <div className="flex items-center gap-5">
                            <div className="text-right">
                              <p className="font-mono text-xl font-bold tabular-nums text-stone-900">{formatINR(sub.totalAmount)}</p>
                              <p className="text-xs font-mono text-stone-500">Incl. 18% VAT</p>
                            </div>

                            {monthlyAllowEarlyClose ? (
                              <button
                                type="button"
                                onClick={() => triggerToast(`Cancellation requested for ${sub.number}`)}
                                className="px-4 py-2.5 rounded-xl text-xs font-semibold border-2 border-rose-500/50 text-rose-800 hover:bg-rose-50 cursor-pointer transition-colors"
                              >
                                Cancel Plan
                              </button>
                            ) : (
                              <span className="px-3.5 py-2 rounded-xl text-xs font-mono bg-stone-200 text-stone-600 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5" /> Locked by Plan
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Tenant Invoices */}
                <div className={`${BENTO.card} p-8 space-y-5`}>
                  <h3 className="text-lg font-bold text-stone-900">My Invoices & Receipts</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className={`text-[11px] font-mono uppercase ${BENTO.tableHeader}`}>
                          <th className="py-3.5 px-5">Invoice #</th>
                          <th className="py-3.5 px-5">Billing Period</th>
                          <th className="py-3.5 px-5">Due Date</th>
                          <th className="py-3.5 px-5 text-right">Total</th>
                          <th className="py-3.5 px-5">Status</th>
                          <th className="py-3.5 px-5 text-right">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 text-sm">
                        {invoices
                          .filter((i) => i.customer === 'Acme Corporation')
                          .map((inv) => (
                            <tr key={inv.id} className="hover:bg-stone-50">
                              <td className="py-4 px-5 font-mono font-bold text-stone-900">{inv.number}</td>
                              <td className="py-4 px-5 font-mono text-xs text-stone-600">{inv.period}</td>
                              <td className="py-4 px-5 font-mono text-xs">{inv.dueDate}</td>
                              <td className="py-4 px-5 text-right font-mono font-bold tabular-nums text-stone-900">
                                {formatINR(inv.total)}
                              </td>
                              <td className="py-4 px-5">
                                <StatusBadge status={inv.status} isOverdue={inv.isOverdue} />
                              </td>
                              <td className="py-4 px-5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setPdfModalInvoice(inv)}
                                  className={BENTO.secondaryBtn}
                                >
                                  <Download className="w-3.5 h-3.5" /> PDF
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* PDF Invoice Modal Preview */}
      {pdfModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-lg p-8 ${BENTO.modal} space-y-6 animate-in fade-in zoom-in-95 duration-150`}>
            <div className="flex items-center justify-between border-b-2 border-stone-200 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 font-bold">
                  Official Tax Invoice
                </span>
                <h3 className="text-xl font-bold font-mono text-stone-900">{pdfModalInvoice.number}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPdfModalInvoice(null)}
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-[#F4F3EF] p-4 rounded-xl border border-stone-200">
              <div>
                <p className="text-stone-500 uppercase">Customer</p>
                <p className="font-bold text-stone-900 mt-0.5">{pdfModalInvoice.customer}</p>
                <p className="text-stone-500 text-[11px]">{pdfModalInvoice.taxId}</p>
              </div>
              <div className="text-right">
                <p className="text-stone-500 uppercase">Issue & Due Date</p>
                <p className="font-bold text-stone-900 mt-0.5">{pdfModalInvoice.issueDate}</p>
                <p className={pdfModalInvoice.isOverdue ? 'text-rose-700 font-bold' : 'text-stone-600'}>
                  Due: {pdfModalInvoice.dueDate}
                </p>
              </div>
            </div>

            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <div className="bg-[#EAE8E1]/70 px-4 py-2 text-[11px] font-mono font-bold flex justify-between">
                <span>Description</span>
                <span>Amount</span>
              </div>
              <div className="p-4 space-y-2 text-xs">
                <div className="flex justify-between font-semibold text-stone-900">
                  <span>{pdfModalInvoice.lineDescription}</span>
                  <span className="font-mono">{formatINR(pdfModalInvoice.subtotal)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs font-mono bg-stone-50 p-4 rounded-xl border border-stone-200">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span>{formatINR(pdfModalInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>VAT (18%):</span>
                <span>+{formatINR(pdfModalInvoice.tax)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t-2 border-stone-200 pt-3 text-stone-950">
                <span>Total (INR):</span>
                <span>{formatINR(pdfModalInvoice.total)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPdfModalInvoice(null)}
                className={BENTO.secondaryBtn}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerToast(`Downloaded ${pdfModalInvoice.number}.pdf`);
                  setPdfModalInvoice(null);
                }}
                className={BENTO.primaryBtn}
              >
                <Download className="w-4 h-4" /> Download PDF Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Payment Modal */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleRecordPayment}
            className={`w-full max-w-md p-8 ${BENTO.modal} space-y-5 animate-in fade-in zoom-in-95 duration-150`}
          >
            <div className="flex items-center justify-between border-b-2 border-stone-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-stone-900">Record Payment</h3>
                <p className="text-xs font-mono text-stone-500">
                  {paymentModalInvoice.number} • {paymentModalInvoice.customer}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalInvoice(null)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-mono uppercase text-stone-600 mb-2 font-bold">Payment Method</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {['UPI', 'CARD', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'OTHER'].map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2.5 px-2 rounded-xl font-mono text-xs cursor-pointer border-2 transition-all ${
                        paymentMethod === m
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-900 font-bold shadow-[2px_2px_0px_rgba(4,120,87,0.2)]'
                          : 'border-stone-200 bg-[#F4F3EF] text-stone-700 hover:border-stone-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-mono uppercase text-stone-600 mb-1.5 font-bold">Amount Received (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className={`w-full font-mono ${BENTO.input}`}
                  required
                />
              </div>

              <div>
                <label className="block font-mono uppercase text-stone-600 mb-1.5 font-bold">Transaction Reference</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className={`w-full font-mono ${BENTO.input}`}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPaymentModalInvoice(null)}
                className={BENTO.secondaryBtn}
              >
                Cancel
              </button>
              <button type="submit" className={BENTO.primaryBtn}>
                Confirm Payment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
