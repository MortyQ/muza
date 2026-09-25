import { fileURLToPath } from "url";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig, loadEnv, type ConfigEnv } from "vite";

export default ({ mode }: ConfigEnv) => {
  const env = loadEnv(mode, process.cwd(), "");

  const targetUrl
    = env.VITE_API_URL ?? "https://todo-list-backend-seven-mauve.vercel.app";

  return defineConfig({
    // GitHub Pages serves the app from /<repo>/, not the domain root; the
    // deploy workflow sets it, and the router reads it back as BASE_URL.
    base: env.VITE_BASE ?? "/",

    plugins: [vue(), tailwindcss()],

    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
      dedupe: ["vue", "vue-router", "pinia"],
    },

    server: {
      port: env.VITE_PORT ? parseInt(env.VITE_PORT) : 5173,
      proxy: {
        "/api": {
          target: targetUrl,
          changeOrigin: true,
          secure: true,
        },
      },
    },

    build: {
      sourcemap: mode !== "production",
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["vue", "vue-router"],
          },
        },
      },
    },
  });
};
