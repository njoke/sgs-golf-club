import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#204733",
          "green-light": "#2f654a",
          sand: "#efe6d1",
          clay: "#9c6b3f",
          gold: "#d0aa5b",
        },
        ui: {
          canvas: "#f5f1e8",
          card: "#fffdf8",
          ink: "#173227",
          muted: "#607567",
          line: "#d9d2c0",
          sidebar: "#163428",
        },
        status: {
          active: "#1f8f4e",
          inactive: "#7c847f",
          waitlisted: "#d28620",
          withdrawn: "#c94a3e",
          open: "#1f8f4e",
          closed: "#c94a3e",
        },
      },
      boxShadow: {
        panel: "0 18px 46px rgba(23, 50, 39, 0.12)",
      },
      borderRadius: {
        panel: "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
