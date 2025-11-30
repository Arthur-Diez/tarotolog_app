import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        "accent-pink": "var(--accent-pink)",
        "accent-gold": "var(--accent-gold)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)"
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      fontFamily: {
        sans: ["Manrope", ...defaultTheme.fontFamily.sans],
        serif: ["Cormorant Garamond", ...defaultTheme.fontFamily.serif]
      },
      boxShadow: {
        glow: "0 0 32px rgba(238, 205, 245, 0.35)"
      },
      backgroundImage: {
        "energy-gradient": "linear-gradient(135deg, #f3c6ff 0%, #ffd8bb 100%)",
        "card-glow": "linear-gradient(145deg, rgba(238,205,245,0.35), rgba(18,14,23,0.3))",
        "accent-energy": "linear-gradient(45deg, #f3c6ff, #ffd8bb)"
      }
    }
  },
  plugins: []
};

export default config;
