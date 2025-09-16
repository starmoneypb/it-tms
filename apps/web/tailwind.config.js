const { heroui } = require("@heroui/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/react/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          500: 'var(--color-primary-500)',
        },
        surface: 'var(--color-surface)',
        background: 'var(--color-background)',
        text: 'var(--color-text)',
      },
      borderRadius: {
        md: 'var(--radius-md)',
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
}
