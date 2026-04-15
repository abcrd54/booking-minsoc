import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
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
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        pitch: {
          950: "#0e0e0e",
          900: "#131313",
          850: "#1a1a1a",
          800: "#20201f",
          750: "#262626",
          700: "#2c2c2c",
        },
        lime: {
          100: "#f3ffcd",
          300: "#c5fe00",
          400: "#b9ef00",
          500: "#9df197",
          700: "#025e16",
        },
        mist: {
          100: "#ffffff",
          300: "#adaaaa",
          500: "#767575",
          700: "#484847",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        stadium: "0 24px 64px rgba(157, 241, 151, 0.08)",
        lime: "0 20px 48px rgba(197, 254, 0, 0.18)",
      },
      fontFamily: {
        sans: ["var(--font-manrope)"],
        headline: ["var(--font-space-grotesk)"],
      },
      letterSpacing: {
        crushed: "-0.02em",
      },
      backgroundImage: {
        "hero-fade":
          "linear-gradient(180deg, rgba(14,14,14,0.15) 0%, rgba(14,14,14,0.68) 58%, rgba(14,14,14,1) 100%)",
        "lime-sheen":
          "linear-gradient(135deg, rgba(243,255,205,1) 0%, rgba(197,254,0,1) 100%)",
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
  plugins: [],
};

export default config;
