/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Static hex values (mirrors :root in globals.css). Using literal hex
        // — instead of `var(--token)` — lets Tailwind generate `bg-accent/20`,
        // `ring-accent/30`, etc. (opacity modifiers require a known color).
        ink: "#1A1814",
        sand: "#F5F3EF",
        accent: "#C4522A",
        green: "#2A7A4B",
        muted: "#8C8880",
        border: "#E8E4DC",
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"DM Mono"', "ui-monospace", "monospace"],
      },
      keyframes: {
        "accordion-down": { from: { height: 0 }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: 0 } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
