import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function validateProductionApiUrl(mode) {
  const apiUrl = loadEnv(mode, process.cwd(), "").VITE_API_URL?.trim();
  if (!apiUrl) {
    throw new Error("Set VITE_API_URL to the production API base URL ending in /api/v1.");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(apiUrl);
  } catch {
    throw new Error("VITE_API_URL must be an absolute production API URL.");
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    parsedUrl.protocol !== "https:" ||
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    /^127(?:\.\d{1,3}){0,3}$/.test(hostname) ||
    hostname === "::1" ||
    hostname.startsWith("::ffff:127.") ||
    hostname.endsWith(".localhost")
  ) {
    throw new Error("VITE_API_URL must use HTTPS and must not point to localhost in a production build.");
  }

  if (parsedUrl.pathname.replace(/\/+$/, "") !== "/api/v1") {
    throw new Error("VITE_API_URL must end with /api/v1.");
  }
}

export default defineConfig(({ mode, command }) => {
  if (command === "build") {
    validateProductionApiUrl(mode);
  }

  return {
    plugins: [react(), tailwindcss()],
  };
});
