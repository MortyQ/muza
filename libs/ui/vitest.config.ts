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
          server: {
            deps: {
              // keyv-browser's ESM build imports "./keyv-idb" without an
              // extension. Vitest externalizes dependencies by default and
              // hands them to Node, whose ESM resolver requires the extension,
              // so the table's storage module fails to import at all. Inlining
              // routes it through Vite's resolver instead, which tries the
              // extensions. The browser project never hits this — Vite serves
              // every module there.
              inline: ["keyv-browser"],
            },
          },
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
            // Vitest's generic on-failure capture writes into __screenshots__
            // under a name derived from the test title, mixing debris in with
            // the real baselines. Redirecting it is not an option:
            // `screenshotDirectory` is resolved against the project root and
            // then joined onto the spec's directory, so any value builds an
            // absolute-path-shaped tree inside tests/. Turned off instead —
            // toMatchScreenshot writes its own -actual/-diff pair on failure,
            // into .vitest-attachments, which is what you actually debug from.
            screenshotFailures: false,
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
      include: ["src/components/{base,feedback,inputs,layout,overlay,table}/**"],
      reporter: ["text", "html", "lcov"],
      // Set just under what the suite currently reaches, so the number can only
      // go up. Only the unit project is instrumented — the browser project runs
      // the same components through a real engine and its coverage would double
      // count. Raise these when a phase lands, not "on aspiration".
      //
      // The bars are per-glob rather than global. `table/` is roughly half the
      // library by volume and starts at zero, so a single global number would
      // have to drop to ~27% — which would let the five finished categories
      // regress by fifty points without anything going red. The table's own bar
      // rises phase by phase until it meets the rest.
      thresholds: {
        "src/components/{base,feedback,inputs,layout,overlay}/**": {
          statements: 78,
          branches: 75,
          functions: 78,
          lines: 80,
        },
        "src/components/table/**": {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0,
        },
      },
    },
  },
});
