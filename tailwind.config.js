/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        p3m: {
          dark:    '#0A1A2E',
          mid:     '#0F2235',
          card:    '#152A3A',
          border:  'rgba(0,191,165,0.18)',
          teal:    '#00BFA5',
          'teal-mid': '#10A48A',
          'teal-dark': '#0D7B6B',
          'teal-lt': '#E0F5F1',
          muted:   'rgba(255,255,255,0.55)',
          rose:    '#C084B8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
