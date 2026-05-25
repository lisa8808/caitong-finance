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
          bg: '#121723',
          nav: '#1E2230',
          chart: '#161A28',
        },
        up: '#FF4D4F',
        down: '#52C41A',
        neutral: '#FFFFFF',
        secondary: '#8C8F98',
        price: '#FFAA00',
      },
      fontSize: {
        'price': ['24px', { fontWeight: '700' }],
        'data': ['12px'],
        'small': ['10px', '14px'],
      },
    },
  },
  plugins: [],
}