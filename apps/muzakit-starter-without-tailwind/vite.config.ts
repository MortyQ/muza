import { fileURLToPath } from "url";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

import { muzakitIcons } from "@muzakit/ui/vite";

export default defineConfig({
  // The library's icons: embedded on build, fetched from the Iconify API in development.
  plugins: [vue(), tailwindcss(), muzakitIcons()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { port: 5173 },
});
