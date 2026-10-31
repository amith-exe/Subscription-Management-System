import React from 'react';

interface StatusBadgeProps {
  status: string;
  isOverdue?: boolean;
}

export function StatusBadge({ status, isOverdue = false }: StatusBadgeProps) {
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
    PAUSED: 'bg-amber-100 text-amber-900 border border-amber-400',
    DRAFT: 'bg-stone-200 text-stone-700 border border-stone-400',
    CLOSED: 'bg-zinc-100 text-zinc-500 border border-zinc-300',
    CANCELLED: 'bg-zinc-100 text-zinc-500 border border-zinc-300',
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

