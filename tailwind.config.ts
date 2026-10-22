import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",

  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      colors: {
        smash: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        court: {
          DEFAULT: "#15803d",
          light: "#22c55e",
          dark: "#14532d",
        },
        tennis: {
          DEFAULT: "#d9f99d",
          ball: "#ccff00",
        },
      },

      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },

      boxShadow: {
        smash: "0 10px 30px -12px rgba(34, 197, 94, 0.45)",
        "smash-lg": "0 20px 45px -18px rgba(34, 197, 94, 0.5)",
      },

      backgroundImage: {
        "smash-gradient":
          "linear-gradient(135deg, #052e16 0%, #14532d 45%, #0f172a 100%)",
        "court-gradient":
          "linear-gradient(180deg, #15803d 0%, #14532d 100%)",
      },

      keyframes: {
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(8px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "slide-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(16px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        pulseSoft: {
          "0%, 100%": {
            opacity: "1",
          },
          "50%": {
            opacity: "0.7",
          },
        },
      },

      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        "slide-up": "slide-up 0.45s ease-out both",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },

      borderRadius: {
        "4xl": "2rem",
      },
    },
  },

  plugins: [],
};

export default config;
