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
        dark: {
          bg: '#1a1a1a',
          card: '#2d2d2d',
          border: '#404040',
          text: '#e5e5e5',
          muted: '#a3a3a3',
        }
      }
    },
  },
  plugins: [],
}
