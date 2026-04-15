/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "var(--brand-primary-blue)",
          neon: "var(--brand-accent-neon)",
          gold: "var(--brand-accent-gold)",
          "gold-soft": "var(--brand-accent-gold-soft)",
          green: "var(--brand-accent-green)",
          "green-soft": "var(--brand-accent-green-soft)",
          cream: "var(--brand-neutral-cream)",
        },
        theme: {
          bg: "var(--page-background)",
          header: "var(--page-header-background)",
          surface: "var(--panel-background)",
          "surface-soft": "var(--panel-background-soft)",
          "surface-strong": "var(--panel-background-strong)",
          "surface-hover": "var(--panel-background-hover)",
          border: "var(--panel-border)",
          "border-soft": "var(--panel-border-soft)",
          text: "var(--text-primary)",
          muted: "var(--text-secondary)",
          subtle: "var(--text-tertiary)",
          contrast: "var(--text-on-accent)",
        },
      },
      boxShadow: {
        panel:
          "0 28px 64px -28px var(--panel-shadow-soft), 0 12px 28px -22px var(--panel-shadow-soft)",
      },
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(var(--hero-gradient-angle), var(--hero-gradient-from), var(--hero-gradient-to))",
      },
      keyframes: {
        "spin-y": {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(360deg)" },
        },
        "pulse-glow": {
          "0%, 100%": { 
            boxShadow:
              "0 0 40px var(--podium-glow-outer, rgba(250,204,21,0.4)), 0 0 20px var(--podium-glow-middle, rgba(250,204,21,0.3)), 0 0 10px var(--podium-glow-inner, rgba(250,204,21,0.2))",
          },
          "50%": { 
            boxShadow:
              "0 0 60px var(--podium-glow-outer-strong, rgba(250,204,21,0.6)), 0 0 30px var(--podium-glow-middle-strong, rgba(250,204,21,0.5)), 0 0 15px var(--podium-glow-inner-strong, rgba(250,204,21,0.4))",
          },
        },
      },
      animation: {
        "spin-y": "spin-y 4s linear infinite",
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
