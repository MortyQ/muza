import { resolve } from "path";

import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: ["vue", "vue-router", "luxon"],
    },
  },
  // No `rollupTypes` — api-extractor cannot resolve the entry under this
  // tsconfig layout, and `types` points at source anyway. Matches libs/ui.
  plugins: [dts({ tsconfigPath: "./tsconfig.json" })],
});
