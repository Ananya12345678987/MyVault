/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
                bg: "#000000",

        surface: "#0B0C0F",
        "surface-alt": "#14161A",

        border: "#1F2329",

        text: "#F5F5F5",
        "text-muted": "#8A8F98",

        "vault-green": "#2DD4A0",
        "vault-green-hover": "#4BE3B3",

        amber: "#D6A84F",
        danger: "#E5645F",
      },

      fontFamily: {
        heading: ["Space Grotesk", "sans-serif"],
        body: ["IBM Plex Sans", "sans-serif"],
                mono: ["IBM Plex Mono", "monospace"],
      },

      boxShadow: {
        glow: "0 0 0 1px rgba(45,212,160,0.35), 0 8px 30px -10px rgba(45,212,160,0.3)",
      },
    },
  },

  plugins: [],
};