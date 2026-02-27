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
      colors: {
        metronom: {
          bg: '#000000',        // Pure black for OLED
          surface: '#1a1a1a',    // Dark gray for surfaces
          primary: '#22c55e',     // Green primary
          accent: '#f59e0b',      // Amber accent
          text: '#ffffff',        // Pure white text
          muted: '#6b7280'        // Muted gray
        }
      },
      animation: {
        'pulse-beat': 'pulse 0.2s ease-in-out',
        'flash': 'flash 0.1s ease-in-out'
      }
    },
  },
  plugins: [],
}