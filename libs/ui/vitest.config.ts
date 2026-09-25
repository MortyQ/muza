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
            // Vitest's generic on-failure capture writes a __screenshots__ tree
            // beside the spec. The token contracts fail on a computed value,
            // which the assertion message already carries, so it is off.
            // Redirecting it is not an option: `screenshotDirectory` is
            // resolved against the project root and then joined onto the
            // spec's directory, building an absolute-path-shaped tree in tests/.
            screenshotFailures: false,
            instances: [
              {
                browser: "chromium",
                // Fixed viewport: layout-dependent components (the table, the
                // floating positioner) read it, so contracts need it stable.
                viewport: { width: 1280, height: 800 },
              },
            ],
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      // Everything shipped from index.ts, including the parts with no tests
      // yet. A zone that is absent from `include` does not read as 0% — it
      // does not appear at all, which makes the report look finished when it
      // is not. `navigation-sidebar/` was invisible this way for its whole
      // life. Uncovered is allowed; unmeasured is not.
      include: ["src/components/**", "src/composables/**", "src/utils/**"],
      // `exclude` replaces the provider's default list rather than extending
      // it, which is harmless here only because `include` is already confined
      // to src/. Two kinds of noise: the table's README, which the coverage
      // provider tries to parse as a module and reports as a RollupError on
      // every run, and type-only modules, which are erased at build time and
      // sit at a permanent 0%.
      exclude: ["**/*.md", "**/types/**", "**/*.d.ts", "**/injectionKeys.ts"],
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
      // now sits alongside the rest. What keeps it off the others' numbers is
      // VTable.vue itself: its virtualization and KeepAlive-handoff branches
      // are unreachable without layout, and the browser project is not
      // instrumented (it would double count).
      thresholds: {
        "src/components/{base,feedback,inputs,layout,overlay}/**": {
          statements: 78,
          branches: 75,
          functions: 78,
          lines: 80,
        },
        "src/components/table/**": {
          statements: 84,
          branches: 78,
          functions: 86,
          lines: 85,
        },
        // The whole folder is covered now — four logic units and thirteen
        // components — so it carries the library's highest bar rather than the
        // split one it had while the components were still outstanding. What
        // keeps it off 100 is geometry: the flyout's position is computed from
        // `getBoundingClientRect`, which jsdom answers with zeroes.
        "src/components/navigation-sidebar/**": {
          statements: 95,
          branches: 93,
          functions: 97,
          lines: 95,
        },
        // Zero on purpose, not by oversight: both zones are in the report so
        // the gap is visible and shrinks on its own schedule, but they gate
        // nothing until tests actually exist. Raise each one to just under
        // what it reaches the moment its first specs land — a bar of 0 that
        // stays at 0 after the work is done is worse than no bar, because it
        // reads as a decision already taken.
        // useModal and useNavigationGuard are covered; useToast and
        // useModalRegister are not, and the mix averages to a number worth
        // seeing before pinning.
        "src/composables/**": {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0,
        },
        "src/utils/**": {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0,
        },
      },
    },
  },
});
