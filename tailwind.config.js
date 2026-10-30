/** @type {import('tailwindcss').Config} */
// The look of the app: cool iOS-style greys, large soft corners, layered shadows, spring-like motion.
// Changing the grey scale and the corner sizes here restyles every screen at once, including the ones
// that use plain classes such as "border-gray-200 rounded-2xl".
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // the button style names are put together in code (btn-primary, btn-success ...), so list them here
  safelist: ['btn-primary', 'btn-secondary', 'btn-soft', 'btn-ghost', 'btn-danger', 'btn-success', 'btn-sm'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', 'Inter', '"Segoe UI"', 'Roboto', 'system-ui', 'sans-serif'],
      },
      colors: {
        gray: {
          50: '#f8f8fb', 100: '#f0f0f5', 200: '#e5e5ec', 300: '#d2d2db', 400: '#a1a1ad',
          500: '#82828e', 600: '#5f5f6b', 700: '#464652', 800: '#2b2b35', 900: '#16161d', 950: '#0b0b10',
        },
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(20,20,40,0.04), 0 1px 1px rgba(20,20,40,0.03)',
        DEFAULT: '0 1px 3px rgba(20,20,40,0.06), 0 1px 2px rgba(20,20,40,0.04)',
        md: '0 4px 14px rgba(20,20,40,0.07), 0 1px 3px rgba(20,20,40,0.05)',
        lg: '0 12px 32px rgba(20,20,40,0.10), 0 2px 6px rgba(20,20,40,0.05)',
        xl: '0 22px 60px rgba(20,20,40,0.16), 0 4px 10px rgba(20,20,40,0.06)',
        '2xl': '0 30px 80px rgba(20,20,40,0.22)',
        glass: 'inset 0 1px 0 rgba(255,255,255,0.75), 0 10px 34px rgba(20,20,40,0.12), 0 1px 3px rgba(20,20,40,0.06)',
      },
      keyframes: {
        sheetIn: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        popIn: { '0%': { opacity: '0', transform: 'scale(0.96) translateY(6px)' }, '100%': { opacity: '1', transform: 'scale(1) translateY(0)' } },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        rise: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        sheet: 'sheetIn 380ms cubic-bezier(0.32, 0.72, 0, 1)',
        pop: 'popIn 240ms cubic-bezier(0.2, 0.9, 0.3, 1.1)',
        fade: 'fadeIn 200ms ease-out',
        rise: 'rise 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
