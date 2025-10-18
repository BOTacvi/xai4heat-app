/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#00A76F",
        secondary: "rgba(0, 167, 111, 0.2)",
        error: {
          DEFAULT: "#E53935", // main red
          bg: "rgba(229, 57, 53, 0.1)", // almost transparent red background
        },
        warning: {
          DEFAULT: "#FF9800", // main orange
          bg: "rgba(255, 152, 0, 0.1)", // almost transparent orange background
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
