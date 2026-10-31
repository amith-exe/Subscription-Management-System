import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Brightloop ERP — Subscription Management',
  description: 'Enterprise Swiss Neo-Bento Subscription & Billing Platform',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[#F4F3EF] text-stone-950 antialiased font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
