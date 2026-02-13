module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#FFFFFF",
          foreground: "hsl(var(--primary-foreground))",
        },
        "background-dark": "#121212",
        "card-dark": "#1A1A1A",
        "text-dark": "#E0E0E0",
        "secondary-dark": "#282828",
        accent: {
          DEFAULT: "#FF0000",
          foreground: "hsl(var(--accent-foreground))",
        },
        "text-accent": "#FF0000",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        threat: {
          low: "#444444",
          mid: "#D4AF37",
          high: "#FF0000",
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Roboto Mono', 'Fira Code', 'monospace'],
        display: ['JetBrains Mono', 'monospace'],
        body: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: "0px",
        lg: "0px",
        xl: "0px",
        md: "0px",
        sm: "0px",
      },
      animation: {
        jitter: 'jitter 0.1s infinite',
        'pulse-red': 'pulse-red 1s ease-in-out infinite',
        'pulse-fast': 'pulse-red 0.5s ease-in-out infinite',
      },
      keyframes: {
        jitter: {
          '0%': { transform: 'translate(0,0)' },
          '25%': { transform: 'translate(-1px,1px)' },
          '50%': { transform: 'translate(1px,-1px)' },
          '75%': { transform: 'translate(-1px,-1px)' },
          '100%': { transform: 'translate(0,0)' },
        },
        'pulse-red': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("tailwindcss-animate"),
  ],
};
