/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        bg: "#F4F2EA",

        surface: "#FBFAF6",
        "surface-alt": "#E8EBDD",

        border: "#D3D8C4",

        text: "#2A3025",
        "text-muted": "#697160",

        "vault-green": "#5F7F5B",
        "vault-green-hover": "#4D6A4A",

        amber: "#A87420",
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