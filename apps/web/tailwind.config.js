/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        sand: "var(--sand)",
        accent: "var(--accent)",
        green: "var(--green)",
        muted: "var(--muted)",
        border: "var(--border)",
      },
    },
  },
  plugins: [],
};
