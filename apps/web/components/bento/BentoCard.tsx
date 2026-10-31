import React from 'react';

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}

export function BentoCard({ children, className = '', interactive = false }: BentoCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border-2 border-stone-900/15 shadow-[4px_4px_0px_rgba(28,25,23,0.06)] p-7 transition-all duration-150 ${
        interactive ? 'hover:border-stone-900/35 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

