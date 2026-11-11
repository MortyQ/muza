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
    dts({
      // vite-plugin-dts prints type errors and still writes dist, and its SFC codegen differs from
      // vue-tsc's, so errors only it sees went unnoticed. Failing here puts them in front of CI.
      afterDiagnostic: (diagnostics) => {
        if (diagnostics.length > 0) {
          throw new Error(`vite-plugin-dts: ${diagnostics.length} type error(s), listed above`);
        }
      },
    }),
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
