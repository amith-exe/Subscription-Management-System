'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      if (typeof window === 'undefined') return;

      try {
        const response = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.accessToken) throw new Error(result.message || 'Google sign-in could not be completed.');

        const payload = JSON.parse(atob(result.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        localStorage.setItem('brightloop_user', JSON.stringify({
          email: payload.email,
          role: payload.role,
          name: payload.email?.split('@')[0] || 'Google User',
          customerId: payload.customerId || null,
          token: result.accessToken,
        }));
        router.push(payload.role === 'CUSTOMER' ? '/portal' : `/?role=${payload.role}`);
      } catch (callbackError) {
        setError(callbackError instanceof Error ? callbackError.message : 'Google sign-in could not be completed.');
      }
    }

    void handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F4F3EF] flex flex-col items-center justify-center p-6 text-stone-900 font-sans">
      <div className="bg-white p-8 rounded-2xl border-2 border-stone-900/15 shadow-md max-w-sm w-full text-center space-y-4">
        {error ? (
          <div className="space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
            <p className="text-sm text-stone-700 font-semibold">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-700 animate-spin mx-auto" />
            <h3 className="font-bold text-base">Authenticating with Google...</h3>
            <p className="text-xs text-stone-500 font-mono">Verifying account credentials</p>
          </div>
        )}
      </div>
    </div>
  );
}

