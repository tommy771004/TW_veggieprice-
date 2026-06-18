import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0d631b",
        "on-primary": "#ffffff",
        "primary-container": "#2e7d32",
        "on-primary-container": "#cbffc2",
        "primary-fixed": "#a3f69c",
        "primary-fixed-dim": "#88d982",
        "on-primary-fixed": "#002204",
        "on-primary-fixed-variant": "#005312",
        "inverse-primary": "#88d982",

        secondary: "#964900",
        "on-secondary": "#ffffff",
        "secondary-container": "#fc820c",
        "on-secondary-container": "#5e2c00",
        "secondary-fixed": "#ffdcc6",
        "secondary-fixed-dim": "#ffb786",
        "on-secondary-fixed": "#311300",
        "on-secondary-fixed-variant": "#723600",

        tertiary: "#4d5950",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#657167",
        "on-tertiary-container": "#e8f5e9",
        "tertiary-fixed": "#d9e6da",
        "tertiary-fixed-dim": "#bdcabe",
        "on-tertiary-fixed": "#131e17",
        "on-tertiary-fixed-variant": "#3e4a41",

        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        surface: "#f8f9fa",
        "surface-dim": "#d9dadb",
        "surface-bright": "#f8f9fa",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f3f4f5",
        "surface-container": "#edeeef",
        "surface-container-high": "#e7e8e9",
        "surface-container-highest": "#e1e3e4",
        "surface-variant": "#e1e3e4",
        "surface-tint": "#1b6d24",

        "on-surface": "#191c1d",
        "on-surface-variant": "#40493d",
        "inverse-surface": "#2e3132",
        "inverse-on-surface": "#f0f1f2",

        outline: "#5c655a",
        "outline-variant": "#bfcaba",

        background: "#f8f9fa",
        "on-background": "#191c1d",
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        sm: "0.75rem",
        md: "1rem",
        lg: "1.25rem",
        xl: "1.5rem",
        "2xl": "1.75rem",
        "3xl": "2rem",
        full: "9999px",
      },
      spacing: {
        "element-gap": "16px",
        "container-padding": "24px",
        base: "12px",
        "section-margin": "32px",
        "glass-blur": "24px",
      },
      fontFamily: {
        sans: ["Work Sans", "Noto Sans TC", "sans-serif"],
      },
      fontSize: {
        "display-price": [
          "calc(48px * var(--font-scale))",
          {
            lineHeight: "calc(56px * var(--font-scale))",
            letterSpacing: "-0.02em",
            fontWeight: "700",
          },
        ],
        "headline-lg": [
          "calc(24px * var(--font-scale))",
          { lineHeight: "calc(32px * var(--font-scale))", fontWeight: "700" },
        ],
        "headline-md": [
          "calc(20px * var(--font-scale))",
          { lineHeight: "calc(28px * var(--font-scale))", fontWeight: "600" },
        ],
        "body-lg": [
          "calc(18px * var(--font-scale))",
          { lineHeight: "calc(26px * var(--font-scale))", fontWeight: "400" },
        ],
        "body-md": [
          "calc(16px * var(--font-scale))",
          { lineHeight: "calc(24px * var(--font-scale))", fontWeight: "400" },
        ],
        "body-sm": [
          "calc(14px * var(--font-scale))",
          { lineHeight: "calc(20px * var(--font-scale))", fontWeight: "400" },
        ],
        "label-bold": [
          "calc(14px * var(--font-scale))",
          {
            lineHeight: "calc(20px * var(--font-scale))",
            letterSpacing: "0.05em",
            fontWeight: "600",
          },
        ],
        "label-sm": [
          "calc(11px * var(--font-scale))",
          { lineHeight: "calc(16px * var(--font-scale))", fontWeight: "500" },
        ],
        "2xs": [
          "calc(10px * var(--font-scale))",
          { lineHeight: "calc(14px * var(--font-scale))" },
        ],
        xs: [
          "calc(12px * var(--font-scale))",
          { lineHeight: "calc(16px * var(--font-scale))" },
        ],
        sm: [
          "calc(14px * var(--font-scale))",
          { lineHeight: "calc(20px * var(--font-scale))" },
        ],
        base: [
          "calc(16px * var(--font-scale))",
          { lineHeight: "calc(24px * var(--font-scale))" },
        ],
        lg: [
          "calc(18px * var(--font-scale))",
          { lineHeight: "calc(28px * var(--font-scale))" },
        ],
        xl: [
          "calc(20px * var(--font-scale))",
          { lineHeight: "calc(28px * var(--font-scale))" },
        ],
        "2xl": [
          "calc(24px * var(--font-scale))",
          { lineHeight: "calc(32px * var(--font-scale))" },
        ],
        "3xl": [
          "calc(30px * var(--font-scale))",
          { lineHeight: "calc(36px * var(--font-scale))" },
        ],
        "4xl": [
          "calc(36px * var(--font-scale))",
          { lineHeight: "calc(40px * var(--font-scale))" },
        ],
        "5xl": ["calc(48px * var(--font-scale))", { lineHeight: "1" }],
        "6xl": ["calc(60px * var(--font-scale))", { lineHeight: "1" }],
        "7xl": ["calc(72px * var(--font-scale))", { lineHeight: "1" }],
      },
      boxShadow: {
        glass: "0 30px 30px rgba(27, 94, 32, 0.04)",
        "glass-sm": "0 4px 30px rgba(27, 94, 32, 0.04)",
        nav: "0 -10px 40px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
