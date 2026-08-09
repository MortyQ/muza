import { fileURLToPath } from "url";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  // `tailwindcss()` is only needed by the browser project, but a project-level
  // plugin list would replace this one rather than extend it, so both projects
  // share it. In jsdom the generated stylesheet is simply never applied.
  plugins: [vue(), tailwindcss()],

  resolve: {
    alias: { "@": `${root}src` },
    // Vue must be a single instance: two copies break provide/inject and the
    // component instance checks inside @vue/test-utils.
    dedupe: ["vue", "vue-router"],
  },

  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["tests/unit/**/*.spec.ts", "tests/conventions.spec.ts"],
          setupFiles: ["./tests/setup/unit.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          include: ["tests/visual/**/*.spec.ts"],
          setupFiles: ["./tests/setup/browser.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            // Failure captures are debugging output, not baselines. Left at the
            // default they land in __screenshots__ beside the real references
            // and get committed by an unwary `git add`.
            screenshotDirectory: ".vitest-attachments/failures",
            instances: [
              {
                browser: "chromium",
                // Fixed viewport: screenshot baselines are only comparable at a
                // stable size, and layout-dependent components read it.
                viewport: { width: 1280, height: 800 },
              },
            ],
          },
          expect: {
            toMatchScreenshot: {
              comparatorName: "pixelmatch",
              comparatorOptions: {
                // Not zero: sub-pixel antialiasing still differs slightly
                // between runs even on identical hardware.
                allowedMismatchedPixelRatio: 0.01,
              },
            },
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      include: ["src/components/{base,feedback,inputs,layout,overlay}/**"],
      reporter: ["text", "html", "lcov"],
    },
  },
});
