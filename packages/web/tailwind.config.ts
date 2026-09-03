import type { Config } from "tailwindcss";

const channel = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--bg)",
        surface: "var(--surface)",
        raised: "var(--raised)",
        hairline: "var(--hairline)",
        hairlineSoft: "var(--hairline-soft)",
        hairlineStrong: "var(--hairline-strong)",
        hover: "var(--hover)",
        seal: "var(--seal)",
        parchment: "var(--text)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        flame: channel("--flame"),
        flameFill: channel("--flame-fill"),
        flameSoft: channel("--flame-soft"),
        flameInk: channel("--flame-ink"),
        ember: channel("--ember"),
        onFlame: channel("--on-flame"),
        good: channel("--good"),
        bad: channel("--bad"),
        warn: channel("--warn"),
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        panel: "24px",
      },
      boxShadow: {
        glass: "0 2px 32px 0 rgba(0,0,0,0.40), inset 0 1px 0 0 rgba(255,255,255,0.05)",
        flame: "0 0 60px -12px rgba(249,209,0,0.45)",
      },
      letterSpacing: {
        tightest: "-0.045em",
        label: "0.18em",
      },
    },
  },
  plugins: [],
};

export default config;
