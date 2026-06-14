/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#475569',
        background: '#f8fafc',
        foreground: '#0f172a',
        success: '#22c55e',
        warning: '#eab308',
        error: '#ef4444',
        'dark-bg': '#0f172a',
        'dark-fg': '#f8fafc'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
