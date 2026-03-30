/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mustard: '#FFC107',
        mustardDark: '#E0A800',
        brandRed: '#EE2A24',
        bgSubtle: '#F4F5f7',
        sidebarDark: '#1E1E2D',
        textMain: '#333333',
        textMuted: '#888888',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
