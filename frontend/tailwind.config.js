/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#020617',
          900: '#0F172A',
          850: '#151F32',
          800: '#1E293B',
          750: '#283548',
          700: '#334155',
          600: '#475569',
          500: '#64748B',
          400: '#94A3B8',
          300: '#CBD5E1',
          200: '#E2E8F0',
          100: '#F1F5F9',
          50: '#F8FAFC'
        },
        transport: {
          blue: '#1E293B',
          navy: '#0F172A',
          amber: '#D97706',
          orange: '#C2410C',
          industrial: '#0F766E',
          zinc: '#27272A',
          charcoal: '#18181B'
        }
      }
    },
  },
  plugins: [],
};
