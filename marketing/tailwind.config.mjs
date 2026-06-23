import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fbfa', 100: '#d4f4f2', 200: '#a9e9e6',
          300: '#72d8d3', 400: '#2bb5af', 500: '#1fafa9',
          600: '#1fafa9', 700: '#198782', 800: '#1a6b68',
          900: '#1b5654', 950: '#0a3433',
        },
        frozi: '#1fafa9',
        charcoal: {
          DEFAULT: '#2e434c', 50: '#f4f6f7', 100: '#e3e8ea',
          200: '#c7d1d5', 300: '#a0b1b8', 400: '#728995',
          500: '#566d78', 600: '#475862', 700: '#3c4a52',
          800: '#2e434c', 900: '#28373e', 950: '#161f23',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        display: ['Raleway', 'Montserrat', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [typography],
}
