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
        brand: { DEFAULT: "#1F3C88", 500: "#24408F", 600: "#1B3474", 700: "#162A5F", 900: "#0C1538" },
        accent: { DEFAULT: "#F4A261", 500: "#E98B3A" },
        shell: { DEFAULT: "#F5F7FB" },
        ivory: { DEFAULT: "#F5F7FB", 200: "#E8EEF9" },
      },
      borderRadius: { "2xl": "1rem" },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("@tailwindcss/forms")],
};
