'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  AlertTriangle,
  Download,
  Lock,
  X,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Layers,
  Building2,
} from 'lucide-react';
import { BENTO } from '@/components/bento/styles';
import { StatusBadge } from '@/components/bento/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PortalSubscription, PortalInvoice } from '@/types/portal';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

type RazorpayCheckout = new (options: {
  key: string; amount: number; currency: string; name: string; description: string; order_id: string;
  prefill: { name: string; email: string }; theme: { color: string };
  modal: { ondismiss: () => void };
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
}) => { open: () => void; on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void };

declare global { interface Window { Razorpay?: RazorpayCheckout } }

export default function CustomerPortalPage() {
  const [accessToken, setAccessToken] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<PortalSubscription[]>([]);
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pdfModalInvoice, setPdfModalInvoice] = useState<PortalInvoice | null>(null);
  const [cancelModalSub, setCancelModalSub] = useState<PortalSubscription | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchPortalData = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const [subsRes, invsRes] = await Promise.all([
        fetch(`${API_URL}/portal/subscriptions`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/portal/invoices`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (subsRes.ok && invsRes.ok) {
        const subsData = await subsRes.json();
        const invsData = await invsRes.json();
        setSubscriptions(subsData.data || subsData);
        setInvoices(invsData.data || invsData);
        setApiConnected(true);
        setAuthError('');
      } else {
        setApiConnected(false);
        setSubscriptions([]);
        setInvoices([]);
        if ([401, 403].includes(subsRes.status) || [401, 403].includes(invsRes.status)) {
          setAuthError(subsRes.status === 403 || invsRes.status === 403
            ? 'This account does not have customer portal access.'
            : 'Your session expired. Please sign in again.');
          setAccessToken('');
        }
      }
    } catch {
      setApiConnected(false);
      setSubscriptions([]);
      setInvoices([]);
      setAuthError('Could not connect to the billing API. Check that the API is running and try refreshing.');
      setSubscriptions([]);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (accessToken) void fetchPortalData(accessToken);
  }, [accessToken, fetchPortalData]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setAuthError('');
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Unable to sign in. Check your email and password.');
      if (result.pending2fa) throw new Error('This account requires a second-factor flow that is not available in the customer portal yet.');
      if (!result.accessToken) throw new Error('Sign-in did not return an access token.');
      setAccessToken(result.accessToken);
      setLoginPassword('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in.');
      setLoading(false);
    }
  };

  const handlePayInvoice = async (invoice: PortalInvoice) => {
    if (!accessToken) return;
    setPayingInvoiceId(invoice.id);
    try {
      const orderResponse = await fetch(`${API_URL}/payments/invoices/${invoice.id}/order`, {
        method: 'POST', headers: { Authorization: `Bearer ${accessToken}` },
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.message ?? 'Could not start checkout.');
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Could not load Razorpay Checkout.'));
          document.body.appendChild(script);
        });
      }
      if (!window.Razorpay) throw new Error('Razorpay Checkout did not initialize.');
      const checkout = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency, name: 'Brightloop',
        description: `Invoice ${invoice.number}`, order_id: order.orderId,
        prefill: { name: order.customerName, email: order.customerEmail }, theme: { color: '#047857' },
        modal: { ondismiss: () => setPayingInvoiceId(null) },
        handler: (payment) => {
          void (async () => {
            try {
              const response = await fetch(`${API_URL}/payments/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify(payment),
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.message ?? 'Payment verification failed.');
              triggerToast(`Payment received for ${invoice.number}.`);
              await fetchPortalData(accessToken);
            } catch (error) {
              triggerToast(error instanceof Error ? error.message : 'Payment verification failed.');
            } finally {
              setPayingInvoiceId(null);
            }
          })();
        },
      });
      checkout.on('payment.failed', (response) => {
        triggerToast(response.error?.description ?? 'Payment was not completed. You can try again.');
        setPayingInvoiceId(null);
      });
      checkout.open();
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Could not start Razorpay Checkout.');
      setPayingInvoiceId(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } finally {
      setAccessToken('');
      setApiConnected(false);
      setInvoices([]);
      setSubscriptions([]);
    }
  };

  const downloadInvoicePdf = async (invoice: PortalInvoice) => {
    try {
      const response = await fetch(`${API_URL}/invoices/${invoice.id}/pdf`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error('Could not download this invoice.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.number}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Could not download this invoice.');
    }
  };

  // Compute portal KPIs
  const activePlanCount = useMemo(
    () => subscriptions.filter((s) => s.status === 'ACTIVE').length,
    [subscriptions]
  );

  const monthlyCommitment = useMemo(
    () => subscriptions.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0),
    [subscriptions]
  );

  const balancePastDue = useMemo(() => {
    return invoices
      .filter((i) => i.isOverdue || (i.status === 'CONFIRMED' && new Date(i.dueDate) < new Date()))
      .reduce((sum, i) => sum + (Number(i.total) - Number(i.amountPaid)), 0);
  }, [invoices]);
  const nextRenewal = useMemo(() => subscriptions
    .map((subscription) => subscription.nextBillingDate)
    .filter((date): date is string => Boolean(date))
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0], [subscriptions]);

  const handleConfirmCancel = async () => {
    if (!cancelModalSub) return;
    try {
      const res = await fetch(`${API_URL}/portal/subscriptions/${cancelModalSub.id}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Subscription cancellation is not available through the API yet.');
      triggerToast(`Subscription ${cancelModalSub.number} successfully cancelled.`);
      await fetchPortalData(accessToken);
    } catch (error) {
      triggerToast(error instanceof Error ? error.message : 'Could not cancel this subscription.');
    } finally {
      setCancelModalSub(null);
    }
  };

  if (!accessToken) {
    return (
      <main className="min-h-screen bg-[#F4F3EF] flex items-center justify-center p-5">
        <form onSubmit={handleLogin} className={`${BENTO.card} w-full max-w-md p-8 space-y-5`}>
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-800 font-bold">Brightloop Customer Portal</p>
            <h1 className="text-2xl font-bold mt-2">Sign in to view and pay invoices</h1>
            <p className="text-sm text-stone-600 mt-2">Use your customer account to securely access your subscriptions and balances.</p>
          </div>
          <label className="block text-sm font-semibold">Email
            <input className="mt-1 w-full rounded-lg border border-stone-300 p-3" type="email" autoComplete="username" required value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} />
          </label>
          <label className="block text-sm font-semibold">Password
            <input className="mt-1 w-full rounded-lg border border-stone-300 p-3" type="password" autoComplete="current-password" required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} />
          </label>
          {authError && <p role="alert" className="text-sm text-rose-700">{authError}</p>}
          <button className={`${BENTO.primaryBtn} w-full`} type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </main>
    );
  }

  return (
    <div className={`min-h-screen ${BENTO.pageBg}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-xl bg-stone-900 text-stone-50 font-semibold text-xs shadow-xl border-2 border-emerald-500">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Swiss Neo-Bento Customer Portal Header */}
      <header className={`${BENTO.headerBg} px-8 py-5 sticky top-0 z-40`}>
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-bold text-lg shadow-[2px_2px_0px_rgba(28,25,23,0.25)]">
              B
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-lg tracking-tight">Brightloop Customer Portal</span>
              </div>
              <p className="text-xs text-stone-500 font-mono mt-0.5">
                Your invoices and subscriptions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3.5 py-2 rounded-xl bg-white border-2 border-stone-900/15 text-xs font-mono flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Tenant Data Isolated
            </span>
            <button onClick={() => void handleSignOut()} className="px-3 py-2 rounded-xl bg-white border-2 border-stone-900/15 text-xs font-semibold">Sign out</button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-200/80 hover:bg-stone-300 text-stone-800 text-xs font-semibold border-2 border-stone-900/15 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Operations
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto p-8 lg:p-10 space-y-8">
        {/* Top 3 Bento KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`${BENTO.card} p-7`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-stone-500">Active Plans</span>
              <Layers className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-3xl font-bold font-mono tabular-nums mt-3">{activePlanCount}</p>
              <p className="text-xs text-stone-600 mt-2">{nextRenewal ? `Next renewal ${formatDate(nextRenewal)}` : 'No upcoming renewal date'}</p>
          </div>

          <div className={`${BENTO.card} p-7`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-stone-500">
                Monthly Total Commitment
              </span>
              <Building2 className="w-4 h-4 text-emerald-700" />
            </div>
            <p className="text-3xl font-bold font-mono tabular-nums mt-3">
              {formatCurrency(monthlyCommitment)}
            </p>
            <p className="text-xs text-stone-600 mt-2">Includes Odoo Variant & PROMO10</p>
          </div>

          <div className={`${BENTO.card} p-7 ${balancePastDue > 0 ? 'border-rose-500/70 bg-rose-50/20' : ''}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-mono uppercase tracking-wider font-bold ${balancePastDue > 0 ? 'text-rose-700' : 'text-stone-500'}`}>
                Balance Past Due
              </span>
              <AlertTriangle className={`w-4 h-4 ${balancePastDue > 0 ? 'text-rose-600' : 'text-stone-400'}`} />
            </div>
            <p className={`text-3xl font-bold font-mono tabular-nums mt-3 ${balancePastDue > 0 ? 'text-rose-700' : 'text-stone-800'}`}>
              {formatCurrency(balancePastDue)}
            </p>
            <p className="text-xs text-stone-600 mt-2">
              {balancePastDue > 0 ? 'Across your overdue invoices' : 'All accounts settled'}
            </p>
          </div>
        </div>

        {/* Section 1: My Subscriptions */}
        <div className={`${BENTO.card} p-8 space-y-6`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">My Subscriptions</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Early cancellation is available only when enabled by your plan policy (
                <code className="font-mono">allowEarlyClose</code>).
              </p>
            </div>
            <button
              onClick={() => void fetchPortalData(accessToken)}
              disabled={loading}
              className={BENTO.secondaryBtn}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="space-y-4">
            {subscriptions.map((sub) => {
              const primaryLine = sub.lines[0];
              return (
                <div
                  key={sub.id}
                  className="p-6 rounded-xl bg-[#F4F3EF]/70 border-2 border-stone-900/12 flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm">{sub.number}</span>
                      <StatusBadge status={sub.status} />
                      <span className="text-xs font-mono text-stone-600">{sub.planName}</span>
                    </div>

                    <p className="text-base font-bold">
                      {primaryLine?.productName}{' '}
                      {primaryLine?.variantName && (
                        <span className="font-mono text-xs font-normal text-emerald-800">
                          ({primaryLine.variantName})
                        </span>
                      )}
                    </p>

                    <p className="text-xs font-mono text-stone-500">
                      Next Billing: {formatDate(sub.nextBillingDate)} • Period: {sub.billingPeriod}
                    </p>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <p className="font-mono text-xl font-bold tabular-nums">
                        {formatCurrency(sub.totalAmount)}
                      </p>
                      <p className="text-xs font-mono text-stone-500">Incl. VAT/Taxes</p>
                    </div>

                    {sub.status !== 'CLOSED' && (
                      sub.allowEarlyClose ? (
                        <button
                          onClick={() => setCancelModalSub(sub)}
                          className="px-4 py-2.5 rounded-xl text-xs font-semibold border-2 border-rose-500/50 text-rose-800 hover:bg-rose-50 active:translate-y-[1px] transition-all cursor-pointer"
                        >
                          Cancel Plan
                        </button>
                      ) : (
                        <span className="px-3.5 py-2 rounded-xl text-xs font-mono bg-stone-200 text-stone-600 flex items-center gap-1.5 border border-stone-300">
                          <Lock className="w-3.5 h-3.5 text-stone-500" /> Locked by Plan
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: My Invoices & PDF Receipts */}
        <div className={`${BENTO.card} p-8 space-y-6`}>
          <div>
            <h2 className="text-lg font-bold">My Invoices & PDF Receipts</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Official tax invoices issued by Brightloop Software with downloadable receipts.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`text-[11px] font-mono uppercase ${BENTO.tableHeader}`}>
                  <th className="py-3.5 px-5">Invoice #</th>
                  <th className="py-3.5 px-5">Issue Date</th>
                  <th className="py-3.5 px-5">Due Date</th>
                  <th className="py-3.5 px-5 text-right">Total</th>
                  <th className="py-3.5 px-5 text-right">Paid</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Payment</th>
                  <th className="py-3.5 px-5 text-right">Receipt</th>
                </tr>
              </thead>
                  <tbody className="divide-y divide-stone-200 text-sm">
                {invoices.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-stone-500">{apiConnected ? 'No invoices are available for this account.' : 'Invoice data is unavailable. Check the API connection and refresh.'}</td></tr>}
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-4 px-5 font-mono font-bold">{inv.number}</td>
                    <td className="py-4 px-5 font-mono text-xs text-stone-600">
                      {formatDate(inv.issueDate)}
                    </td>
                    <td className="py-4 px-5 font-mono text-xs">
                      <span className={inv.isOverdue ? 'text-rose-700 font-bold' : ''}>
                        {formatDate(inv.dueDate)}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right font-mono font-bold tabular-nums">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="py-4 px-5 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                      {formatCurrency(inv.amountPaid)}
                    </td>
                    <td className="py-4 px-5">
                      <StatusBadge status={inv.status} isOverdue={inv.isOverdue} />
                    </td>
                    <td className="py-4 px-5 text-right">
                      {apiConnected && ['CONFIRMED', 'OVERDUE'].includes(inv.status) && Number(inv.total) > Number(inv.amountPaid) && (
                        <button onClick={() => void handlePayInvoice(inv)} disabled={payingInvoiceId === inv.id} className={BENTO.primaryBtn}>
                          {payingInvoiceId === inv.id ? 'Opening…' : `Pay ${formatCurrency(Number(inv.total) - Number(inv.amountPaid))}`}
                        </button>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
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
      </main>

      {/* PDF Modal */}
      {pdfModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-lg p-8 ${BENTO.modal} space-y-6 animate-in fade-in zoom-in-95 duration-150`}>
            <div className="flex items-center justify-between border-b-2 border-stone-200 pb-4">
              <div>
                <span className="text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-400">
                  Official Tax Invoice PDF
                </span>
                <h3 className="text-2xl font-bold font-mono mt-1.5">{pdfModalInvoice.number}</h3>
              </div>
              <button
                onClick={() => setPdfModalInvoice(null)}
                className="p-1.5 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-stone-500">Billed To:</span>
                <span className="font-bold">Customer account</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Issue / Due Date:</span>
                <span>
                  {formatDate(pdfModalInvoice.issueDate)} → {formatDate(pdfModalInvoice.dueDate)}
                </span>
              </div>

              {pdfModalInvoice.lines.map((line) => (
                <div
                  key={line.id}
                  className="p-4 rounded-xl bg-[#F4F3EF] border-2 border-stone-900/15 space-y-1.5 my-2"
                >
                  <p className="font-sans font-bold text-sm text-stone-900">{line.description}</p>
                  <div className="flex justify-between text-stone-600">
                    <span>
                      Qty {line.quantity} × {formatCurrency(line.unitPrice)}
                    </span>
                    <span className="font-bold">{formatCurrency(line.amount)}</span>
                  </div>
                </div>
              ))}

              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(pdfModalInvoice.subtotal)}</span>
              </div>
              {Number(pdfModalInvoice.discountTotal) > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount Applied:</span>
                  <span>-{formatCurrency(pdfModalInvoice.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>VAT / Tax Total:</span>
                <span>+{formatCurrency(pdfModalInvoice.taxTotal)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t-2 border-stone-200 pt-3 text-stone-950">
                <span>Grand Total:</span>
                <span>{formatCurrency(pdfModalInvoice.total)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setPdfModalInvoice(null)} className={BENTO.secondaryBtn}>
                Close
              </button>
              <button
                onClick={() => {
                  void downloadInvoicePdf(pdfModalInvoice);
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

      {/* Cancel Subscription Policy Confirmation Modal */}
      {cancelModalSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md p-8 ${BENTO.modal} space-y-5 animate-in fade-in zoom-in-95 duration-150`}>
            <div className="flex items-center justify-between border-b-2 border-stone-200 pb-3">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-lg font-bold">Cancel Subscription?</h3>
              </div>
              <button onClick={() => setCancelModalSub(null)} className="p-1 rounded hover:bg-stone-100">
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to cancel subscription <strong className="font-mono">{cancelModalSub.number}</strong> ({cancelModalSub.planName})? 
              Under your plan policy (<code className="font-mono">allowEarlyClose: true</code>), billing will terminate immediately and no further invoices will be generated.
            </p>

            <div className="flex justify-end gap-3 pt-3">
              <button onClick={() => setCancelModalSub(null)} className={BENTO.secondaryBtn}>
                Keep Plan
              </button>
              <button onClick={() => void handleConfirmCancel()} className={BENTO.dangerBtn}>
                Yes, Cancel Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

