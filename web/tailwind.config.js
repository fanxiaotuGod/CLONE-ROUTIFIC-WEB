/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ccfbf1',
          100: '#99f6e4',
          200: '#5eead4',
          300: '#2dd4bf',
          400: '#14b8a6',
          500: '#0d9488',
          600: '#0d9488', // Your main teal color
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
    },
  },
  plugins: [],
}