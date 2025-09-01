// tailwind.config.js
module.exports = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {               // Persian Plum
          DEFAULT: "#701C1C",
          700: "#5E1717",
          800: "#4A1212",
        },
        ivory: {               // Ivory Quartz
          DEFAULT: "#F0EAD6",
          100: "#F8F5EA",
        },
      },
      borderRadius: { "2xl": "1rem" },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
