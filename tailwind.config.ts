import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070c1b",
          900: "#0b1226",
          800: "#111b3a",
          700: "#1a2752",
          600: "#24356e"
        },
        gold: {
          300: "#ffd98a",
          400: "#f6c453",
          500: "#e8aF2e",
          600: "#c98f1b"
        },
        aqua: {
          300: "#7ef0e0",
          400: "#33d6c2",
          500: "#12b5a3"
        }
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.06), 0 8px 24px -12px rgba(16,24,40,.18)",
        glow: "0 0 0 1px rgba(51,214,194,.25), 0 12px 40px -12px rgba(51,214,194,.35)"
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(1200px 500px at 10% -10%, rgba(51,214,194,.18), transparent 60%), radial-gradient(900px 420px at 90% 0%, rgba(246,196,83,.16), transparent 55%)"
      }
    }
  },
  plugins: []
};
export default config;
