'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, BadgePercent, Box, CircleDollarSign, FileText, LayoutDashboard, RefreshCw, Search } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';

type Product = { id: string; name: string; type: string; salesPrice: string | number; costPrice: string | number; variants: { id: string }[] };
type Invoice = { id: string; displayNumber?: string; number: string; status: string; total: string | number; dueDate: string; issueDate: string; customer?: { name?: string; company?: string }; payments?: { amount: string | number }[] };
type Discount = { id: string; name: string; code?: string | null; type: string; value: string | number; appliesTo: string; isActive: boolean; usedCount: number; usageLimit?: number | null; endDate?: string | null };
type Data = { products: Product[]; invoices: Invoice[]; discounts: Discount[] };
type Tab = 'overview' | 'invoices' | 'products' | 'discounts';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path} returned ${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}

function money(value: string | number | undefined) { return formatCurrency(value ?? 0); }
function Status({ value }: { value: string }) {
  return <span className={`status status-${value.toLowerCase()}`}><i />{value.toLowerCase().replaceAll('_', ' ')}</span>;
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<Data>({ products: [], invoices: [], discounts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [products, invoices, discounts] = await Promise.all([
        get<{ items: Product[]; total: number }>('/products?page=1&limit=100'),
        get<{ data: Invoice[]; total: number }>('/invoices?page=1&pageSize=100'),
        get<Discount[]>('/discounts'),
      ]);
      setData({ products: products.items, invoices: invoices.data, discounts });
      setUpdatedAt(new Date());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load data from the API.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const stats = useMemo(() => {
    const outstanding = data.invoices.reduce((sum, invoice) => {
      const paid = invoice.payments?.reduce((total, payment) => total + Number(payment.amount), 0) ?? 0;
      return sum + Math.max(0, Number(invoice.total) - paid);
    }, 0);
    const overdue = data.invoices.filter((invoice) => invoice.status === 'CONFIRMED' && new Date(invoice.dueDate) < new Date()).length;
    return { products: data.products.length, invoices: data.invoices.length, outstanding, overdue };
  }, [data]);

  const filteredProducts = data.products.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  const filteredInvoices = data.invoices.filter((item) => `${item.displayNumber ?? item.number} ${item.customer?.name ?? ''} ${item.status}`.toLowerCase().includes(search.toLowerCase()));
  const navigation: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard }, { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'products', label: 'Products', icon: Box }, { id: 'discounts', label: 'Discounts', icon: BadgePercent },
  ];

  return <main className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#overview"><span className="brand-mark"><CircleDollarSign size={21} /></span><span>subscript<span className="brand-dot">.</span><small>REVENUE OPERATIONS</small></span></a>
      <div className="workspace-label">WORKSPACE</div>
      <nav aria-label="Main navigation">{navigation.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${tab === id ? 'selected' : ''}`} onClick={() => { setTab(id); setSearch(''); }}><Icon size={18} /><span>{label}</span>{id === 'invoices' && stats.overdue > 0 && <b>{stats.overdue}</b>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="api-indicator"><span className={error ? 'offline-dot' : 'online-dot'} />API {error ? 'disconnected' : 'connected'}</div><span className="api-address">{API_URL}</span></div>
    </aside>

    <section className="main-area">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>{navigation.find((item) => item.id === tab)?.label}</strong></div><div className="top-actions"><span className="live-indicator"><i /> Live data</span><button className="refresh-button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />Refresh</button><div className="avatar">SM</div></div></header>
      <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow">SUBSCRIPTION MANAGEMENT</div><h1>{tab === 'overview' ? 'Good morning' : navigation.find((item) => item.id === tab)?.label}<span className="heading-period">{tab === 'overview' ? 'Here’s what’s happening with your business.' : 'Live records from your workspace.'}</span></h1></div><div className="last-updated">{updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Connecting to API…'}</div></div>
        {error && <div className="error-banner"><Activity size={18} /><div><strong>Could not reach the API</strong><span>{error}. Start the API with <code>npm run dev</code> from the project root.</span></div><button onClick={() => void refresh()}>Try again</button></div>}

        {tab === 'overview' && <>
          <div className="welcome-card"><div className="welcome-copy"><div className="welcome-tag"><span /> OPERATIONS OVERVIEW</div><h2>Your subscription business,<br />at a glance.</h2><p>Keep track of billing, catalog, and active promotions in one place.</p></div><div className="welcome-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-core"><Activity size={34}/></div><div className="art-chip chip-one"><ArrowUpRight size={14}/></div><div className="art-chip chip-two"><CircleDollarSign size={14}/></div></div><div className="welcome-index">01 <span>/ 04</span></div></div>
          <div className="section-title"><div><h2>Business snapshot</h2><p>Summary of your current billing data</p></div><span className="period-pill">ALL TIME <span>⌄</span></span></div>
          <div className="stats-grid">
            <article className="stat-card"><div className="stat-top"><span>Total products</span><span className="stat-icon blue"><Box size={17}/></span></div><div className="stat-value">{loading ? '—' : stats.products}</div><div className="stat-foot"><span className="stat-neutral">Catalog</span><span>available products</span></div><div className="sparkline spark-blue"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
            <article className="stat-card"><div className="stat-top"><span>Invoices issued</span><span className="stat-icon violet"><FileText size={17}/></span></div><div className="stat-value">{loading ? '—' : stats.invoices}</div><div className="stat-foot"><span className="stat-positive"><ArrowUpRight size={13}/> Live</span><span>from billing records</span></div><div className="sparkline spark-violet"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
            <article className="stat-card"><div className="stat-top"><span>Outstanding balance</span><span className="stat-icon amber"><CircleDollarSign size={17}/></span></div><div className="stat-value money-value">{loading ? '—' : money(stats.outstanding)}</div><div className="stat-foot"><span className={stats.overdue ? 'stat-warning' : 'stat-positive'}>{stats.overdue ? `${stats.overdue} overdue` : 'On track'}</span><span>unpaid invoice balance</span></div><div className="sparkline spark-amber"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
            <article className="stat-card"><div className="stat-top"><span>Active promotions</span><span className="stat-icon green"><BadgePercent size={17}/></span></div><div className="stat-value">{loading ? '—' : data.discounts.filter((item) => item.isActive && (!item.endDate || new Date(item.endDate) >= new Date())).length}</div><div className="stat-foot"><span className="stat-neutral">Discounts</span><span>currently running</span></div><div className="sparkline spark-green"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div></article>
          </div>
          <div className="lower-grid"><section className="panel"><div className="panel-heading"><div><h3>Recent invoices</h3><p>Your latest billing activity</p></div><button className="text-button" onClick={() => setTab('invoices')}>View all <ArrowUpRight size={14}/></button></div><InvoiceTable invoices={data.invoices.slice(0, 5)} loading={loading}/></section><section className="panel health-panel"><div className="panel-heading"><div><h3>Workspace status</h3><p>API connection and catalog health</p></div><span className="health-icon"><Activity size={17}/></span></div><div className="health-row"><span className="health-check">✓</span><div><strong>API connection</strong><small>{error ? 'Unable to connect' : `Connected to ${API_URL}`}</small></div><Status value={error ? 'OFFLINE' : 'ONLINE'}/></div><div className="health-row"><span className="health-check">✓</span><div><strong>Product catalog</strong><small>{loading ? 'Loading records…' : `${stats.products} active products loaded`}</small></div><span className="health-value">{loading ? '—' : stats.products}</span></div><div className="health-row"><span className="health-check">✓</span><div><strong>Billing records</strong><small>{loading ? 'Loading records…' : `${stats.invoices} invoices loaded`}</small></div><span className="health-value">{loading ? '—' : stats.invoices}</span></div><div className="health-note"><span>i</span> Figures are calculated from the latest invoice and payment records.</div></section></div>
        </>}

        {tab === 'invoices' && <section className="panel full-panel"><div className="panel-heading"><div><h3>All invoices</h3><p>{stats.invoices} billing records from your API</p></div><SearchBox value={search} onChange={setSearch}/></div><InvoiceTable invoices={filteredInvoices} loading={loading} empty="No invoices match your search."/></section>}
        {tab === 'products' && <section className="panel full-panel"><div className="panel-heading"><div><h3>Product catalog</h3><p>{stats.products} active products from your API</p></div><SearchBox value={search} onChange={setSearch}/></div><div className="table-wrap"><table><thead><tr><th>PRODUCT</th><th>TYPE</th><th>VARIANTS</th><th>UNIT PRICE</th><th>COST PRICE</th></tr></thead><tbody>{filteredProducts.map((item) => <tr key={item.id}><td><div className="primary-cell"><span className="product-symbol"><Box size={15}/></span><strong>{item.name}</strong></div></td><td><span className="type-pill">{item.type}</span></td><td>{item.variants.length} variants</td><td className="table-money">{money(item.salesPrice)}</td><td>{money(item.costPrice)}</td></tr>)}{!loading && filteredProducts.length === 0 && <tr><td colSpan={5} className="empty-state">No products match your search.</td></tr>}</tbody></table></div></section>}
        {tab === 'discounts' && <section className="panel full-panel"><div className="panel-heading"><div><h3>Discounts & promotions</h3><p>{data.discounts.length} discount rules from your API</p></div></div><div className="table-wrap"><table><thead><tr><th>DISCOUNT</th><th>CODE</th><th>TYPE</th><th>SCOPE</th><th>USAGE</th><th>STATUS</th></tr></thead><tbody>{data.discounts.map((item) => <tr key={item.id}><td><div className="primary-cell"><span className="product-symbol promo"><BadgePercent size={15}/></span><strong>{item.name}</strong></div></td><td>{item.code || '—'}</td><td>{item.type === 'PERCENT' ? `${item.value}% off` : money(item.value)}</td><td><span className="type-pill">{item.appliesTo}</span></td><td>{item.usedCount}{item.usageLimit ? ` / ${item.usageLimit}` : ' uses'}</td><td><Status value={item.isActive && (!item.endDate || new Date(item.endDate) >= new Date()) ? 'ACTIVE' : 'INACTIVE'}/></td></tr>)}{!loading && data.discounts.length === 0 && <tr><td colSpan={6} className="empty-state">No discounts found.</td></tr>}</tbody></table></div></section>}
        <footer className="page-footer"><span>SUBSCRIPT MANAGEMENT SYSTEM <b>·</b> OPERATIONS PORTAL</span><span>Connected to local API <i className={error ? 'offline-dot' : 'online-dot'}/></span></footer>
      </div>
    </section>
  </main>;
}

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="search-box"><Search size={15}/><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search records..." /></label>;
}

function InvoiceTable({ invoices, loading, empty = 'No invoice records yet.' }: { invoices: Invoice[]; loading: boolean; empty?: string }) {
  return <div className="table-wrap"><table><thead><tr><th>INVOICE</th><th>CUSTOMER</th><th>ISSUED</th><th>DUE DATE</th><th>AMOUNT</th><th>STATUS</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.id}><td><strong className="invoice-number">{invoice.displayNumber ?? invoice.number}</strong></td><td>{invoice.customer?.name ?? invoice.customer?.company ?? '—'}</td><td>{formatDate(invoice.issueDate)}</td><td>{formatDate(invoice.dueDate)}</td><td className="table-money">{money(invoice.total)}</td><td><Status value={invoice.status === 'CONFIRMED' && new Date(invoice.dueDate) < new Date() ? 'OVERDUE' : invoice.status}/></td></tr>)}{loading && invoices.length === 0 && <tr><td colSpan={6} className="empty-state">Connecting to API and loading invoices…</td></tr>}{!loading && invoices.length === 0 && <tr><td colSpan={6} className="empty-state">{empty}</td></tr>}</tbody></table></div>;
}
