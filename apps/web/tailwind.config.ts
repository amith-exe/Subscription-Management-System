import type { Config } from 'tailwindcss';
import path from 'path';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/web/app/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/web/components/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/web/lib/**/*.{js,ts,jsx,tsx,mdx}',
    path.join(__dirname, 'app/**/*.{js,ts,jsx,tsx,mdx}').replace(/\\/g, '/'),
    path.join(__dirname, 'components/**/*.{js,ts,jsx,tsx,mdx}').replace(/\\/g, '/'),
    path.join(__dirname, 'lib/**/*.{js,ts,jsx,tsx,mdx}').replace(/\\/g, '/'),
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
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
