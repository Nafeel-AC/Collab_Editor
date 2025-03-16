/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        raleway: ["Raleway", "sans-serif"],
        'playfair': ['"Playfair Display"', 'serif'],

      },
    },
  },
  plugins: [
    require('daisyui'),
  ],
}

