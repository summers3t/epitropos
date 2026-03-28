/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Boutique Advisory Palette
        boutique: {
          navy: "#0F172A", // Deep Authority (Primary)
          sand: "#FDFCFB", // Background/Paper
          gold: "#B45309", // Strategic Accent
          emerald: "#064E3B", // "BUY" (Stronger than standard emerald)
          rose: "#881337", // "DO NOT BUY" (Professional, not alarming)
          slate: "#334155", // Analytical Neutral
        },
      },
      fontFamily: {
        // We will keep Montserrat for headers but add a Serif option for 'Legal' feel
        serif: ["var(--font-playfair)", "serif"],
        sans: ["var(--font-montserrat)", "sans-serif"],
      },
      boxShadow: {
        glass: "0 12px 30px rgba(0,0,0,0.18)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 1s ease-out forwards",
      },
    },
  },
  plugins: [],
};
