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
  plugins: [dts({
    tsconfigPath: "./tsconfig.json",
    // vite-plugin-dts prints type errors and still writes dist, and its SFC codegen differs from
    // vue-tsc's, so errors only it sees went unnoticed. Failing here puts them in front of CI.
    afterDiagnostic: (diagnostics) => {
      if (diagnostics.length > 0) {
        throw new Error(`vite-plugin-dts: ${diagnostics.length} type error(s), listed above`);
      }
    },
  })],
});
