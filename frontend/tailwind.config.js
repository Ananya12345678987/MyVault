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

        surface: "#0D0D10",
        "surface-alt": "#161619",

        border: "#232326",

        text: "#F5F5F5",
        "text-muted": "#8A8A8F",

        "vault-green": "#34A67E",
        "vault-green-hover": "#42B88F",

        amber: "#D6A84F",
      },

      fontFamily: {
        heading: ["Space Grotesk", "sans-serif"],
        body: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },

  plugins: [],
};