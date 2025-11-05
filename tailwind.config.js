/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // Enable dark mode via class on html element
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary green color (main brand color)
        primary: {
          DEFAULT: "#16a34a", // green-600
          foreground: "#ffffff",
          light: "#22c55e", // green-500 for hover
          dark: "#15803d", // green-700 for pressed
        },
        // Secondary - transparent green for hover states
        secondary: {
          DEFAULT: "rgba(22, 163, 74, 0.15)", // transparent green
          hover: "rgba(22, 163, 74, 0.25)", // slightly more opaque on hover
        },
        // Background colors for light and dark themes
        background: {
          light: "#f7f7f5", // dirty white - main app background in light mode
          "light-card": "#ffffff", // white - cards in light mode
          dark: "#1a1a1a", // dark background - main app background in dark mode
          "dark-card": "#1b1b1b", // black - cards, nav, and header in dark mode
        },
        // Status colors
        error: {
          DEFAULT: "#E53935",
          bg: "rgba(229, 57, 53, 0.1)",
        },
        warning: {
          DEFAULT: "#FF9800",
          bg: "rgba(255, 152, 0, 0.1)",
        },
        success: {
          DEFAULT: "#4CAF50",
          bg: "rgba(76, 175, 80, 0.1)",
        },
        info: {
          DEFAULT: "#2196F3",
          bg: "rgba(33, 150, 243, 0.1)",
        },
      },
    },
  },
  plugins: [],
};
