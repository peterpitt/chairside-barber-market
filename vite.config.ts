import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Plain Vite + React single-page app. No SSR, nitro, or Cloudflare targets.
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
});
