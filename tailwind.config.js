/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace']
      },
      animation: {
        'pulse-beat': 'pulse 0.2s ease-in-out',
        'flash': 'flash 0.1s ease-in-out'
      }
    },
  },
  plugins: [],
}