/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#020617',
          900: '#0B0E14',
          800: '#1A1D23',
          700: '#2D323A',
        }
      }
    },
  },
  plugins: [],
}
