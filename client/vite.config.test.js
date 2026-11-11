import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{js,jsx,ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "vite.config.test.js"],
    setupFiles: "./src/__tests__/setup.js",
  },
});
