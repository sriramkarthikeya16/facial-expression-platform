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
        primary: {
          DEFAULT: '#6366F1', // indigo-500
          dark: '#4F46E5',    // indigo-600
          light: '#818CF8',   // indigo-400
        },
        secondary: {
          DEFAULT: '#8B5CF6', // violet-500
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#1E293B',    // slate-800
          2: '#F3F4F6',
          '2-dark': '#334155' // slate-700
        },
        background: {
          DEFAULT: '#F9FAFB',
          dark: '#0F172A',    // slate-900
        },
        expression: {
          happy: '#10B981',   // emerald-500
          sad: '#3B82F6',     // blue-500
          angry: '#EF4444',   // red-500
          fear: '#8B5CF6',    // purple-500
          disgust: '#F59E0B', // amber-500
          surprise: '#EC4899',// pink-500
          neutral: '#6B7280', // gray-500
          occluded: '#F97316',// orange-500
          noface: '#64748B'   // slate-500
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
