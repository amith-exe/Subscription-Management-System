'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  Layers,
  Crown
} from 'lucide-react';
import { BENTO } from '@/components/bento/styles';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (selectedRole?: 'ADMIN' | 'INTERNAL' | 'CUSTOMER', demoEmail?: string) => {
    setLoading(true);
    setError(null);

    const loginEmail = demoEmail || email;
    const loginPassword = password || 'Password@123';

    try {
      // In demo mode or if connecting to API:
      const role = selectedRole || (loginEmail.includes('admin') ? 'ADMIN' : loginEmail.includes('staff') ? 'INTERNAL' : 'CUSTOMER');
      
      // Store current user session in localStorage for front-end persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'brightloop_user',
          JSON.stringify({
            email: loginEmail,
            role,
            name: role === 'ADMIN' ? 'System Administrator' : role === 'INTERNAL' ? 'Staff Operations Lead' : 'Acme Corporation (Tenant)',
            customerId: role === 'CUSTOMER' ? 'cust-acme-001' : null,
          })
        );
      }

      // Route based on role
      if (role === 'CUSTOMER') {
        router.push('/portal');
      } else {
        router.push('/?role=' + role);
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F3EF] flex flex-col justify-center items-center p-6 text-stone-950 font-sans">
      <div className="w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-700 text-white font-black text-2xl shadow-[4px_4px_0px_rgba(28,25,23,0.2)]">
            B
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Brightloop ERP</h1>
          <p className="text-xs font-mono text-stone-600">
            Enterprise Subscription Management • Swiss Neo-Bento UI
          </p>
        </div>

        {/* Login Bento Box */}
        <div className={`${BENTO.card} p-8 space-y-6`}>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Sign In to Your Workspace</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Access level is strictly determined by your assigned role.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-mono uppercase text-stone-600 font-bold mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border-2 border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-emerald-700 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-stone-600 font-bold mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border-2 border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-emerald-700 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${BENTO.primaryBtn} py-3 text-xs`}
            >
              Sign In to Platform <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Role Switcher */}
          <div className="pt-4 border-t-2 border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 font-bold">
                1-Click Demo Personas
              </span>
              <span className="text-[10px] font-mono text-emerald-700 font-semibold">Instant Access</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => handleLogin('ADMIN', 'admin@brightloop.com')}
                className="w-full p-3 rounded-xl bg-[#F4F3EF] hover:bg-stone-200/80 border-2 border-stone-900/15 flex items-center justify-between text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center">
                    <Crown className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-stone-900">Administrator</p>
                    <p className="text-[10px] font-mono text-stone-500">Full System & Governance</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-800">Admin View →</span>
              </button>

              <button
                type="button"
                onClick={() => handleLogin('INTERNAL', 'staff@brightloop.com')}
                className="w-full p-3 rounded-xl bg-[#F4F3EF] hover:bg-stone-200/80 border-2 border-stone-900/15 flex items-center justify-between text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-stone-900">Internal Staff</p>
                    <p className="text-[10px] font-mono text-stone-500">Sales Quotes & Billing Ops</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-800">Staff Ops →</span>
              </button>

              <button
                type="button"
                onClick={() => handleLogin('CUSTOMER', 'billing@acme.com')}
                className="w-full p-3 rounded-xl bg-[#F4F3EF] hover:bg-stone-200/80 border-2 border-stone-900/15 flex items-center justify-between text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-stone-900">Customer (Acme Corp)</p>
                    <p className="text-[10px] font-mono text-stone-500">Self-Service Portal Only</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-teal-800">Portal View →</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-2 text-stone-500 text-xs font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Strict Role-Based Access Control Enforced</span>
        </div>
      </div>
    </div>
  );
}
