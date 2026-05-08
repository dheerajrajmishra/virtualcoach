/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        brand: {
          DEFAULT: '#1a1a2e',
          light: '#16213e',
          accent: '#0f3460',
        },
      },
    },
  },
  plugins: [],
}
