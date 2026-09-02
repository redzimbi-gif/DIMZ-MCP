import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0b0d12",
          soft: "#565c68",
          faint: "#8a909c",
        },
        line: {
          DEFAULT: "#e6e8ee",
          soft: "#f0f1f5",
        },
        surface: {
          DEFAULT: "#ffffff",
          sunken: "#f7f8fa",
        },
        blue: {
          50: "#eef4ff",
          100: "#dce8ff",
          200: "#b8d1ff",
          300: "#89b1fb",
          400: "#5a8ef2",
          500: "#2f6fed",
          600: "#1f57d1",
          700: "#1a44a6",
          800: "#173a87",
          900: "#132f6c",
        },
        good: { DEFAULT: "#1a9e6b", bg: "#e8f8f1" },
        warn: { DEFAULT: "#b5780a", bg: "#fdf3e0" },
        bad: { DEFAULT: "#d13f3f", bg: "#fceaea" },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Inter",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          '"SF Mono"',
          '"Cascadia Mono"',
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,13,18,0.04), 0 1px 1px rgba(11,13,18,0.03)",
        pop: "0 12px 32px rgba(11,13,18,0.12)",
      },
      borderRadius: {
        lg2: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
