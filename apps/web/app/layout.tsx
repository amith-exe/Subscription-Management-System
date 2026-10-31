import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Brightloop ERP — Subscription Management',
  description: 'Enterprise Swiss Neo-Bento Subscription & Billing Platform',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#F4F3EF] text-stone-950 antialiased font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
