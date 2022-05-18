const plugin = require('tailwindcss/plugin');
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  purge: ['./src/components/**/*.tsx', './src/pages/**/*.tsx', './src/features/**/*.tsx'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    fontFamily: {
      sans: ['Montserrat', ...defaultTheme.fontFamily.sans],
      serif: ['Optima', ...defaultTheme.fontFamily.serif],
      mono: [...defaultTheme.fontFamily.mono],
    },
    extend: {
      fontSize: {
        '2xl': '2rem',
      },
      colors: {
        primary: '#121212',
        secondary: '#242424',
        main: '#121212',
        'text-base': 'white',
        'primary-start': '#FCA963',
        'primary-stop': '#FD4857',
        gray: {
          600: '#3F3F3F',
          700: '#898989',
          800: '#2A2A2A',
        },
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [require('@tailwindcss/forms')],
};
