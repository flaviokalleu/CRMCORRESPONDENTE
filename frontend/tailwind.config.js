/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta principal — Navy + Laranja
        caixa: {
          // Navy
          primary: '#0B1426',        // Navy profundo
          secondary: '#162a4a',      // Navy médio
          light: '#F97316',          // Laranja (accent)
          'extra-light': '#FDBA74',  // Laranja claro

          // Laranja de destaque
          orange: '#F97316',         // Laranja principal
          'orange-light': '#FB923C', // Laranja claro
          'orange-dark': '#EA580C',  // Laranja escuro

          // Cinzas e neutros
          gray: {
            50: '#FAF7F2',
            100: '#F0F2F5',
            200: '#E8E2D9',
            300: '#D4CFC7',
            400: '#A09B93',
            500: '#7A756E',
            600: '#5C5850',
            700: '#3E3A34',
            800: '#252220',
            900: '#141210',
          },

          // Status colors
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
          red: '#EF4444',
        },

        // Primary scale — alinhado ao navy
        primary: {
          50: '#F0F4FA',
          100: '#D9E4F0',
          200: '#B3C8E0',
          300: '#7A9EC4',
          400: '#4A7BAD',
          500: '#0B1426',
          600: '#162a4a',
          700: '#0B1426',
          800: '#0A1020',
          900: '#070C18',
          950: '#050910',
        },

        // Cores de gradiente
        gradient: {
          'caixa-primary': 'linear-gradient(135deg, #0B1426 0%, #162a4a 100%)',
          'caixa-secondary': 'linear-gradient(135deg, #162a4a 0%, #1e3a5c 100%)',
          'caixa-accent': 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)',
        }
      },
      spacing: {
        '20px': '20px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.5s ease-in-out',
        'pulse-slow': 'pulse 3s infinite',
        'gradient': 'gradient 3s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundImage: {
        'caixa-gradient': 'linear-gradient(135deg, #0B1426 0%, #122240 50%, #162a4a 100%)',
        'caixa-gradient-reverse': 'linear-gradient(135deg, #162a4a 0%, #122240 50%, #0B1426 100%)',
        'caixa-orange': 'linear-gradient(135deg, #F97316 0%, #EA580C 50%, #C2410C 100%)',
      }
    },
    fontFamily: {
      sans: ["'Plus Jakarta Sans'", 'Inter var', 'sans-serif'],
      serif: ["'Cormorant Garamond'", 'Georgia', 'serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
  },
  plugins: []
}
