import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'primary': '#0d631b',
        'on-primary': '#ffffff',
        'primary-container': '#2e7d32',
        'on-primary-container': '#cbffc2',
        'primary-fixed': '#a3f69c',
        'primary-fixed-dim': '#88d982',
        'on-primary-fixed': '#002204',
        'on-primary-fixed-variant': '#005312',
        'inverse-primary': '#88d982',

        'secondary': '#964900',
        'on-secondary': '#ffffff',
        'secondary-container': '#fc820c',
        'on-secondary-container': '#5e2c00',
        'secondary-fixed': '#ffdcc6',
        'secondary-fixed-dim': '#ffb786',
        'on-secondary-fixed': '#311300',
        'on-secondary-fixed-variant': '#723600',

        'tertiary': '#4d5950',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#657167',
        'on-tertiary-container': '#e8f5e9',
        'tertiary-fixed': '#d9e6da',
        'tertiary-fixed-dim': '#bdcabe',
        'on-tertiary-fixed': '#131e17',
        'on-tertiary-fixed-variant': '#3e4a41',

        'error': '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',

        'surface': '#f8f9fa',
        'surface-dim': '#d9dadb',
        'surface-bright': '#f8f9fa',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f3f4f5',
        'surface-container': '#edeeef',
        'surface-container-high': '#e7e8e9',
        'surface-container-highest': '#e1e3e4',
        'surface-variant': '#e1e3e4',
        'surface-tint': '#1b6d24',

        'on-surface': '#191c1d',
        'on-surface-variant': '#40493d',
        'inverse-surface': '#2e3132',
        'inverse-on-surface': '#f0f1f2',

        'outline': '#707a6c',
        'outline-variant': '#bfcaba',

        'background': '#f8f9fa',
        'on-background': '#191c1d',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
      spacing: {
        'element-gap': '12px',
        'container-padding': '20px',
        'base': '8px',
        'section-margin': '24px',
        'glass-blur': '16px',
      },
      fontFamily: {
        sans: ['Work Sans', 'Noto Sans TC', 'sans-serif'],
      },
      fontSize: {
        'display-price': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'headline-md': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '26px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-bold': ['14px', { lineHeight: '20px', letterSpacing: '0.05em', fontWeight: '600' }],
        'label-sm': ['11px', { lineHeight: '16px', fontWeight: '500' }],
      },
      boxShadow: {
        'glass': '0 30px 30px rgba(27, 94, 32, 0.04)',
        'glass-sm': '0 4px 30px rgba(27, 94, 32, 0.04)',
        'nav': '0 -10px 40px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}

export default config
