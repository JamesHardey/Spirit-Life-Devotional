import type { Config } from "tailwindcss";

// Palette + type matched directly against the live spiritlifecns.com site
// (dark navy surfaces, amber #F59E0B primary accent, Inter throughout).
// The logo itself (globe + flame + open book) keeps its purple/orange —
// see public/icons/ — but the app's UI chrome mirrors the real site's
// neutral-navy + amber product palette, not the logo's own colors.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          amber: {
            50: "#fffbeb",
            100: "#fef3c7",
            200: "#fde68a",
            300: "#fcd34d",
            400: "#fbbf24",
            500: "#f59e0b",
            600: "#d97706",
            700: "#b45309",
            800: "#92400e",
            900: "#78350f",
            950: "#451a03",
          },
          flame: {
            50: "#fff7ed",
            100: "#ffedd5",
            200: "#fed7aa",
            300: "#fdba74",
            400: "#fb923c",
            500: "#f97316",
            600: "#ea580c",
            700: "#c2410c",
            800: "#9a3412",
            900: "#7c2d12",
          },
        },
        surface: {
          dark: "#0A0E14",
          card: "#131A22",
          input: "#1B2430",
        },
        content: {
          primary: "#FFFFFF",
          secondary: "#B4BEC9",
          muted: "#6B7684",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
