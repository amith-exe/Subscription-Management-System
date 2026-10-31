# Brightloop ERP — Swiss Neo-Bento Design System (`DESIGN.md`)

This document is the single source of truth for our **4-person frontend/fullstack team**. Every page across **Admin**, **Internal Staff**, **Customer Portal**, and **Finance Analytics** must follow these exact color tokens, spacing rules, and reusable component patterns so the application looks unified.

---

## 1. Design Philosophy: "Breathable Swiss Neo-Bento"

* **Architectural Clarity:** Inspired by Swiss grid typography and modular Bento compartments. Every functional group lives inside a clearly bounded white module (`bg-white`) over a warm stone canvas (`#F4F3EF`).
* **Low Visual Density (Breathable Enterprise):** Unlike cramped legacy ERPs, we use generous padding (`p-6` to `p-8`), wide grid gaps (`gap-6`), and tall table rows (`py-4 px-5`) so complex B2B pricing, variants (`Odoo +₹560`), and invoices feel calm and effortless to read.
* **Tactile Structural Borders:** Cards and controls use `2px` architectural borders (`border-2 border-stone-900/15`) paired with a subtle hard offset shadow (`shadow-[4px_4px_0px_rgba(28,25,23,0.06)]`).
* **Strict Tabular Monospace:** Every serial number (`SUB-000001`, `INV-000001`), quantity, tax percentage, and currency figure (`₹`) uses `font-mono tabular-nums` so vertical columns align to the pixel.

---

## 2. Core Color Composition

### Surface & Structural Palette
| Token Role | Hex / Value | Tailwind Utility Class | Usage |
| :--- | :--- | :--- | :--- |
| **App Canvas** | `#F4F3EF` | `bg-[#F4F3EF]` | Main page background across all views |
| **Sidebar / Muted Surface** | `#EAE8E1` | `bg-[#EAE8E1]` | Internal navigation sidebar & table headers |
| **Bento Card Surface** | `#FFFFFF` | `bg-white` | Primary containers, KPI cards, data tables, modals |
| **Structural Border** | `rgba(28,25,23,0.15)` | `border-2 border-stone-900/15` | Standard card, table, and section borders |
| **Interactive Hover Border** | `rgba(28,25,23,0.35)` | `hover:border-stone-900/35` | Card and interactive tile hover state |
| **Hard Offset Shadow** | `4px 4px 0px` | `shadow-[4px_4px_0px_rgba(28,25,23,0.06)]` | Signature Swiss Neo-Bento card elevation |
| **Button Tactile Shadow** | `2px 2px 0px` | `shadow-[2px_2px_0px_rgba(28,25,23,0.20)]` | Primary action buttons |

### Typography Hierarchy
| Token Role | Hex | Tailwind Class | Usage |
| :--- | :--- | :--- | :--- |
| **Primary Ink** | `#0C0A09` | `text-stone-950` | Page titles, card headings, total amounts, IDs |
| **Secondary Body** | `#44403C` | `text-stone-700` | Customer names, product descriptions, table cells |
| **Muted Metadata** | `#78716C` | `text-stone-500` | Column headers, timestamps, helper subtitles |

### Brand & Semantic Status Palette
| State / Meaning | Background | Text | Border | Tailwind Badge Classes |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Brand (Emerald)** | `#047857` | `#FFFFFF` | `#1C1917` | `bg-emerald-700 hover:bg-emerald-800 text-white` |
| **`ACTIVE` / `PAID`** | `#D1FAE5` | `#065F46` | `#34D399` | `bg-emerald-100 text-emerald-900 border border-emerald-400` |
| **`CONFIRMED`** | `#E0F2FE` | `#075985` | `#38BDF8` | `bg-sky-100 text-sky-900 border border-sky-400` |
| **`QUOTATION` / `PAUSED`** | `#FEF3C7` | `#92400E` | `#FBBF24` | `bg-amber-100 text-amber-900 border border-amber-400` |
| **`DRAFT`** | `#E7E5E4` | `#44403C` | `#A8A29E` | `bg-stone-200 text-stone-700 border border-stone-400` |
| **`CLOSED` / `CANCELLED`** | `#F4F4F5` | `#71717A` | `#D4D4D8` | `bg-zinc-100 text-zinc-500 border border-zinc-300` |
| **`OVERDUE` (Computed)** | `#FFE4E6` | `#9F1239` | `#F43F5E` | `bg-rose-100 text-rose-900 border-2 border-rose-500 font-bold` |

---

## 3. Spacing & Density Rules (Less-Dense Standard)

To keep the UI clean and uncluttered, follow these spacing rules strictly:

1. **Page Container Padding:** Always use `p-8 lg:p-10` with `max-w-[1360px] mx-auto` and vertical section spacing of `space-y-8`.
2. **Bento Grid Gaps:** Use `gap-6` between KPI cards and `gap-8` between major workspace blocks.
3. **Internal Card Padding:**
   * KPI / Metric Bento Cards: `p-6 lg:p-7`
   * Major Table / Form Containers: `p-7 lg:p-8`
4. **Maximum Card Density:** Never place more than **3 data points** inside a single KPI Bento card (1 Top Label, 1 Large Monospace Figure, 1 Bottom Context Pill).
5. **Table Row Breathing Room:**
   * Header cells (`<th>`): `py-3.5 px-5 text-[11px] font-mono uppercase tracking-wider text-stone-600 bg-[#EAE8E1]/60`
   * Body cells (`<td>`): `py-4.5 px-5 text-sm` (minimum `56px` row height so rows never feel squished).

---

## 4. Shared Tailwind Configuration (`apps/web/tailwind.config.ts`)

Drop this into `apps/web/tailwind.config.ts` so every team member has the exact Bento shadows and color tokens:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F4F3EF',
        sidebar: '#EAE8E1',
        brand: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
        },
      },
      boxShadow: {
        bento: '4px 4px 0px rgba(28, 25, 23, 0.06)',
        'bento-lg': '8px 8px 0px rgba(28, 25, 23, 0.12)',
        tactile: '2px 2px 0px rgba(28, 25, 23, 0.20)',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 5. Role-Based Layout Shells

We use **two distinct visual shells** so users immediately know whether they are in the internal back-office or the customer portal:

1. **Internal Back-Office Shell (`ADMIN`, `INTERNAL`, `FINANCE`):**
   * Left architectural sidebar (`w-64 bg-[#EAE8E1] border-r-2 border-stone-900/15 p-6`).
   * Main content area (`bg-[#F4F3EF] p-8 lg:p-10 space-y-8`).
2. **Customer Self-Service Portal Shell (`CUSTOMER`):**
   * **No sidebar.** Clean top horizontal navigation bar (`bg-[#EAE8E1]/80 border-b-2 border-stone-900/15 px-8 py-5`).
   * Centered container (`max-w-5xl mx-auto p-8 space-y-8`) with a visible **Tenant Isolation Badge**.

---

## 6. Core Reusable UI Modules (Copy-Paste Ready)

### Module A: Bento Card Container
```tsx
export function BentoCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-xl border-2 border-stone-900/15 shadow-[4px_4px_0px_rgba(28,25,23,0.06)] p-7 transition-all duration-150 hover:border-stone-900/30 ${className}`}
    >
      {children}
    </div>
  );
}
```

### Module B: Semantic Status Badge (Handles Computed Overdue)
```tsx
export function StatusBadge({
  status,
  isOverdue = false,
}: {
  status: string;
  isOverdue?: boolean;
}) {
  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-100 text-rose-900 border-2 border-rose-500">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
        OVERDUE
      </span>
    );
  }

  const styles: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-900 border border-emerald-400",
    PAID: "bg-emerald-100 text-emerald-900 border border-emerald-400",
    CONFIRMED: "bg-sky-100 text-sky-900 border border-sky-400",
    QUOTATION: "bg-amber-100 text-amber-900 border border-amber-400",
    DRAFT: "bg-stone-200 text-stone-700 border border-stone-400",
    CLOSED: "bg-zinc-100 text-zinc-500 border border-zinc-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold ${
        styles[status] ?? styles.DRAFT
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
```

### Module C: Tactile Buttons & Inputs
```tsx
// Primary Action Button
export const primaryBtnClass =
  "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold border border-stone-900/20 shadow-[2px_2px_0px_rgba(28,25,23,0.20)] active:translate-y-[1px] transition-all cursor-pointer";

// Secondary Structural Button
export const secondaryBtnClass =
  "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F4F3EF] hover:bg-stone-200/80 text-stone-800 text-xs font-semibold border-2 border-stone-900/15 transition-all cursor-pointer";

// Standard Form Input
export const inputClass =
  "w-full px-3.5 py-2.5 rounded-xl bg-white border-2 border-stone-300 text-stone-950 text-sm placeholder:text-stone-400 focus:outline-none focus:border-emerald-700 transition-colors";
```

---

