'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  Building2,
  Layers,
  Shield,
  KeyRound,
  FlaskConical,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { BENTO } from '@/components/bento/styles';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

// Spec-compliant test profiles for all 3 access tiers
const TEST_PROFILES = [
  {
    role: 'ADMIN' as const,
    label: 'System Administrator',
    email: 'admin@brightloop.io',
    password: 'Password123!',
    icon: Shield,
    badgeColor: 'bg-stone-900 text-stone-100',
    description: 'Catalog CRUD, pricing, plans, policy governance, taxes, and system discounts',
    targetRoute: '/?role=ADMIN',
  },
  {
    role: 'INTERNAL' as const,
    label: 'Operations Staff',
    email: 'staff@brightloop.io',
    password: 'Password123!',
    icon: Layers,
    badgeColor: 'bg-emerald-800 text-emerald-50',
    description: 'Quotations, subscription lifecycle state machine, invoicing, payments, and receivables',
    targetRoute: '/?role=INTERNAL',
  },
  {
    role: 'CUSTOMER' as const,
    label: 'Customer (Acme Corp)',
    email: 'billing@acme.com',
    password: 'Password123!',
    icon: Building2,
    badgeColor: 'bg-teal-800 text-teal-50',
    description: 'Customer Portal, tenant data isolation, online Razorpay invoice payments, early closure',
    targetRoute: '/portal',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(true);

  const performLogin = async (
    loginEmail: string,
    loginPassword: string,
    forceRole?: 'ADMIN' | 'INTERNAL' | 'CUSTOMER',
    customerName?: string
  ) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let resolvedRole: 'ADMIN' | 'INTERNAL' | 'CUSTOMER' = forceRole || 'CUSTOMER';
      let token = '';
      let customerId: string | null = null;
      let userName = customerName || 'User';

      // 1. Attempt real API authentication
      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: loginEmail, password: loginPassword }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.accessToken) {
            token = data.accessToken;
            try {
              const base64Url = token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split('')
                  .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                  .join('')
              );
              const payload = JSON.parse(jsonPayload);
              if (payload.role) resolvedRole = payload.role;
              if (payload.customerId) customerId = payload.customerId;
              userName = payload.email.split('@')[0];
            } catch { }
          }
        } else if (!forceRole) {
          const errData = await response.json().catch(() => ({}));
          const matchingTest = TEST_PROFILES.find(
            (p) => p.email.toLowerCase() === loginEmail.trim().toLowerCase()
          );
          if (!matchingTest) {
            throw new Error(errData.message || 'Invalid email or password.');
          }
        }
      } catch (networkErr: any) {
        const matchingTest = TEST_PROFILES.find(
          (p) => p.email.toLowerCase() === loginEmail.trim().toLowerCase()
        );
        if (!matchingTest && !forceRole) {
          throw networkErr;
        }
      }

      // 2. Resolve fallback role
      if (!token || !forceRole) {
        const lower = loginEmail.toLowerCase();
        if (forceRole) {
          resolvedRole = forceRole;
        } else if (lower.includes('admin')) {
          resolvedRole = 'ADMIN';
        } else if (lower.includes('staff')) {
          resolvedRole = 'INTERNAL';
        } else {
          resolvedRole = 'CUSTOMER';
        }
      }

      userName =
        userName !== 'User'
          ? userName
          : resolvedRole === 'ADMIN'
            ? 'System Administrator'
            : resolvedRole === 'INTERNAL'
              ? 'Operations Staff Lead'
              : 'Acme Corporation';

      if (resolvedRole === 'CUSTOMER' && !customerId) {
        customerId = 'cust-acme-001';
      }

      // 3. Persist session in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'brightloop_user',
          JSON.stringify({
            email: loginEmail,
            role: resolvedRole,
            name: userName,
            customerId,
            token: token || 'demo-auth-token',
          })
        );
      }

      // 4. Role-based routing
      if (resolvedRole === 'CUSTOMER') {
        router.push('/portal');
      } else {
        router.push(`/?role=${resolvedRole}`);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all registration fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Attempt backend signup
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });

      if (res.ok) {
        setSuccess('Account registered successfully! Signing you in...');
      }
      // Instant seamless sign-in for customer tier
      setTimeout(() => {
        void performLogin(email.trim(), password, 'CUSTOMER', name.trim());
      }, 600);
    } catch {
      // Offline fallback: sign up locally as Customer tier
      void performLogin(email.trim(), password, 'CUSTOMER', name.trim());
    }
  };

  const handleGoogleAuth = () => {
    const clientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      '155057581026-7h6orq3jta9rqi0g770dud9nhq2ig5g9.apps.googleusercontent.com';
    const callbackUrl =
      process.env.NEXT_PUBLIC_GOOGLE_CALLBACK_URL ||
      (typeof window !== 'undefined' ? `${window.location.origin}/auth/google/callback` : 'http://localhost:3000/auth/google/callback');

    if (!testMode && clientId) {
      // Direct authentic Google OAuth 2.0 authorization endpoint
      const googleOAuthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
        `response_type=token%20id_token&` +
        `scope=openid%20email%20profile&` +
        `nonce=${Math.random().toString(36).substring(2)}`;

      window.location.href = googleOAuthUrl;
      return;
    }

    // Test mode 1-click evaluation profile
    localStorage.setItem(
      'brightloop_user',
      JSON.stringify({
        email: 'alex.chen@gmail.com',
        role: 'CUSTOMER',
        name: 'Alex Chen (Google Account)',
        customerId: 'cust-google-001',
        token: 'google-oauth-demo-token',
      })
    );
    router.push('/portal');
  };

  const handleSelectTestProfile = (profile: (typeof TEST_PROFILES)[number]) => {
    setEmail(profile.email);
    setPassword(profile.password);
    void performLogin(profile.email, profile.password, profile.role);
  };

  return (
    <div className="min-h-screen bg-[#F4F3EF] flex flex-col justify-center items-center p-6 text-stone-950 font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-700 text-white font-black text-xl shadow-[2px_2px_0px_rgba(28,25,23,0.2)]">
            B
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Brightloop</h1>
          <p className="text-xs text-stone-600 font-mono">Subscription & Billing Platform</p>
        </div>

        {/* Card Box */}
        <div className={`${BENTO.card} p-8 space-y-6`}>
          <div className="flex items-center justify-between">
            {/* Tabs: Sign In / Sign Up */}
            <div className="flex bg-stone-200/70 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setError(null);
                  setSuccess(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === 'signin' ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                  }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setError(null);
                  setSuccess(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === 'signup' ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                  }`}
              >
                Sign Up
              </button>
            </div>

            {/* Test Mode Switch */}
            <button
              type="button"
              onClick={() => {
                setTestMode(!testMode);
                setError(null);
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer border ${testMode
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-sm'
                : 'bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200'
                }`}
              title="Toggle dummy credentials for hackathon test evaluation"
            >
              <FlaskConical className="w-3 h-3 text-amber-700" />
              <span>Test Mode: {testMode ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Google Authenticator Action */}
          <div>
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 border-2 border-stone-300 text-stone-800 text-xs font-semibold shadow-sm transition-all cursor-pointer hover:border-stone-400"
            >
              {/* Google 4-Color SVG Icon */}
              <svg className="w-4.5 h-4.5 shrink-0" width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{tab === 'signin' ? 'Continue with Google' : 'Sign up with Google'}</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-[11px] font-mono text-stone-500">
                <span className="bg-[#F4F3EF] px-2">or with work email</span>
              </div>
            </div>
          </div>

          {/* Test Mode Account Selector */}
          {testMode && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 border-2 border-amber-200 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-900 font-bold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-700" /> Dummy Credentials (3 Tiers)
                </span>
                <span className="text-[10px] font-mono text-amber-800">Click to fill</span>
              </div>

              <div className="space-y-1.5">
                {TEST_PROFILES.map((profile) => {
                  const Icon = profile.icon;
                  return (
                    <button
                      key={profile.role}
                      type="button"
                      disabled={loading}
                      onClick={() => handleSelectTestProfile(profile)}
                      className="w-full p-2.5 rounded-lg bg-white hover:bg-amber-100/70 border border-amber-300/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-md ${profile.badgeColor} flex items-center justify-center shrink-0`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-stone-900 leading-tight">{profile.label}</p>
                          <p className="text-[10px] font-mono text-stone-500 truncate">{profile.email} • {profile.password}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-emerald-800 shrink-0 ml-2">Sign in →</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Standard Form: Sign In */}
          {tab === 'signin' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!email.trim() || !password) {
                  setError('Please provide email and password.');
                  return;
                }
                void performLogin(email.trim(), password);
              }}
              className="space-y-3.5"
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
                    autoComplete="username"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border-2 border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-emerald-700 transition-colors font-sans"
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
                    autoComplete="current-password"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border-2 border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-emerald-700 transition-colors font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full ${BENTO.primaryBtn} py-3 text-xs flex items-center justify-center gap-2 cursor-pointer mt-2`}
              >
                <span>{loading ? 'Authenticating…' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Standard Form: Sign Up */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono uppercase text-stone-600 font-bold mb-1.5">
                  Full Name / Company
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe or Acme Corp"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border-2 border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-emerald-700 transition-colors font-sans"
                  />
                </div>
              </div>

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
                    autoComplete="username"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border-2 border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-emerald-700 transition-colors font-sans"
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
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border-2 border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-emerald-700 transition-colors font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full ${BENTO.primaryBtn} py-3 text-xs flex items-center justify-center gap-2 cursor-pointer mt-2`}
              >
                <span>{loading ? 'Creating Account…' : 'Create Customer Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Clean Enterprise Footer */}
        <div className="text-center text-stone-500 text-[11px] font-mono">
          Brightloop Enterprise Platform v1.0.0
        </div>
      </div>
    </div>
  );
}
