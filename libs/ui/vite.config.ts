import { resolve } from "path";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

import { muzakitIcons } from "./vite/icons.js";

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    dts(),
    // `vite build` embeds the library's own icons into dist, so consumers of the package never
    // need the plugin themselves.
    muzakitIcons(),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: [
        "vue",
        "vue-router",
        "@vueuse/core",
        "@iconify/vue",
        "@muzakit/utils",
        "luxon",
      ],
      output: {
        assetFileNames: "style.css",
      },
    },
  },
});
