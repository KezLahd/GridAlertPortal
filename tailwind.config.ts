import type { Config } from "tailwindcss"
import { heroui } from "@heroui/theme"

// Wattle: cream, ink and one gold. Tailwind's stock greys, slates and oranges are remapped onto the warm
// Wattle neutrals and the gold, so the whole portal (much of it written with stock classes) changes in one place.
const warm = {
  50: "#FBF8F2", 100: "#F3EEE3", 200: "#E6DFD1", 300: "#D3CBBB", 400: "#9C9588", 500: "#6F685C",
  600: "#57514A", 700: "#3A342B", 800: "#2A2620", 900: "#1D1A16", 950: "#12100D",
}
const gold = {
  50: "#FFF8E1", 100: "#FDEFC2", 200: "#FBE08A", 300: "#F8CF52", 400: "#F5C023", 500: "#F2B300",
  600: "#C98F00", 700: "#8A6400", 800: "#6B4E00", 900: "#4A3600", 950: "#2E2200",
}

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        gray: warm, slate: warm, zinc: warm, neutral: warm, stone: warm,
        orange: gold, amber: gold, yellow: gold, blue: gold, sky: gold, indigo: gold,
        black: "#1A1814",
        cream: "#F7F3EA",
        ink: "#24211C",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        warning: {
          DEFAULT: "hsl(38, 92%, 50%)",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        rounded: ["ui-rounded", '"SF Pro Rounded"', "system-ui", "sans-serif"],
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    heroui({
      themes: {
        light: { colors: { primary: { DEFAULT: "#F2B300", foreground: "#24211C" }, focus: "#F2B300",
                           background: "#FBF8F2", foreground: "#24211C" } },
        dark: { colors: { primary: { DEFAULT: "#F2B300", foreground: "#24211C" }, focus: "#F2B300",
                          background: "#12100D", foreground: "#F3EEE4" } },
      },
    }),
  ],
} satisfies Config

export default config
