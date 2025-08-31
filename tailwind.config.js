/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: {
        brand: {
          50:  "#eef6ff",
          100: "#d9eaff",
          200: "#b7d6ff",
          300: "#8fbdff",
          400: "#5f9aff",
          500: "#3478f6",
          600: "#235fd6",
          700: "#1d4fb1",
          800: "#1b428f",
          900: "#172f67",
        },
        muted: { DEFAULT: "#f6f7f9", foreground: "#6b7280" },
        card:  { DEFAULT: "#ffffff", foreground: "#0f172a" },
        border:{ DEFAULT: "#e5e7eb" },
      },
      borderRadius: {
        lg: "10px",
        xl: "14px",
        "2xl": "16px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.04)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
