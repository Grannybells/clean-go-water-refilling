/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.tsx',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d8ecff',
          500: '#2b8cff',
          600: '#1f6fe5',
          700: '#1858b8',
        },
      },
    },
  },
  plugins: [],
};
