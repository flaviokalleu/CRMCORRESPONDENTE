/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta principal CAIXA
        caixa: {
          // Azuis principais
          primary: '#1B4F72',      // Azul principal escuro
          secondary: '#1B4F72',    // Azul médio
          light: '#5DADE2',        // Azul claro
          'extra-light': '#AED6F1', // Azul muito claro
          
          // Laranja de destaque
          orange: '#1B4F72',       // Laranja principal
          'orange-light': '#0E2A44', // Laranja claro
          'orange-dark': '#5DADE2', // Laranja escuro
          
          // Cinzas e neutros
          gray: {
            50: '#F8F9FA',
            100: '#F1F3F4',
            200: '#E8EAED',
            300: '#DADCE0',
            400: '#BDC1C6',
            500: '#9AA0A6',
            600: '#80868B',
            700: '#5F6368',
            800: '#3C4043',
            900: '#202124',
          },
          
          // Status colors seguindo o padrão CAIXA
          success: '#28A745',
          warning: '#FFC107',
          error: '#DC3545',
          info: '#17A2B8',
        },
        
        // Mantendo compatibilidade com primary existente
        primary: {
          50: '#F0F9FF',
          100: '#E0F2FE', 
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#1B4F72',    // Usando azul CAIXA como primary-500
          600: '#2980B9',    // Azul médio
          700: '#1B4F72',    // Azul escuro
          800: '#154360',    // Azul mais escuro
          900: '#0E2A44',    // Azul muito escuro
          950: '#082F49',
        },
        
        // Cores de gradiente para o sistema
        gradient: {
          'caixa-primary': 'linear-gradient(135deg, #1B4F72 0%, #2980B9 100%)',
          'caixa-secondary': 'linear-gradient(135deg, #2980B9 0%, #5DADE2 100%)',
          'caixa-accent': 'linear-gradient(135deg, #FF8C00 0%, #FFB347 100%)',
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
        'caixa-gradient': 'linear-gradient(135deg,rgb(7, 32, 48) 0%,rgb(39, 81, 107) 50%,rgb(51, 98, 129) 100%)',
        'caixa-gradient-reverse': 'linear-gradient(135deg, #5DADE2 0%, #2980B9 50%, #1B4F72 100%)',
        'caixa-orange': 'linear-gradient(135deg,rgb(3, 80, 128) 0%,rgb(3, 80, 128) 50%,rgb(3, 80, 128) 100%)',
      }
    },
    fontFamily: {
      sans: ['Inter var', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
  },
  plugins: []
}
