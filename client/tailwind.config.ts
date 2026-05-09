import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "ui-monospace", "monospace"]
      },
      colors: {
        ink: {
          950: "#111314",
          900: "#181b1d",
          850: "#202529",
          800: "#293036",
          700: "#3a434b",
          500: "#6e7a85",
          300: "#c5cbd1",
          100: "#f6f7f8"
        },
        accent: {
          green: "#7edb91",
          cyan: "#54d6d0",
          amber: "#efb65c",
          red: "#f17883"
        }
      }
    }
  },
  plugins: []
} satisfies Config;