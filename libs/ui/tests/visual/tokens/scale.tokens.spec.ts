import { describe, expect, it } from "vitest";

import { applyTheme, THEME_CASES } from "../../setup/theme";
import { rawToken, tokenAsValue } from "../../setup/tokens";

/**
 * The scales themselves. Component contracts check that a component reads a
 * token; these check that the token still holds the step the scale promises,
 * so a scale cannot quietly grow a step or drift off its grid.
 */
describe.each(THEME_CASES)("scales — %s theme", (theme) => {
  describe("spacing", () => {
    // A 4px grid; 2px and 6px are the only half steps.
    const SPACING = [
      ["2xs", 2], ["xs", 4], ["sm", 6], ["md", 8], ["lg", 12],
      ["xl", 16], ["2xl", 24], ["3xl", 32], ["4xl", 40],
    ] as const;

    it.each(SPACING)("--ui-space-%s is %ipx", async (step, px) => {
      await applyTheme(theme);
      expect(tokenAsValue("padding-top", `--ui-space-${step}`)).toBe(`${px}px`);
    });
  });

  describe("type", () => {
    // Four working sizes and one for headline figures; nothing in between.
    const TYPE = [["xs", 11], ["base", 13], ["lg", 15], ["xl", 20], ["display", 28]] as const;

    it.each(TYPE)("--ui-text-%s is %ipx", async (step, px) => {
      await applyTheme(theme);
      expect(tokenAsValue("font-size", `--ui-text-${step}`)).toBe(`${px}px`);
    });

    it.each(["2xs", "sm", "2xl", "3xl"])("--ui-text-%s is gone", async (step) => {
      await applyTheme(theme);
      expect(getComputedStyle(document.documentElement).getPropertyValue(`--ui-text-${step}`))
        .toBe("");
    });
  });

  describe("elevation", () => {
    // Two levels: sm for resting cards, lg for anything that floats.
    it.each(["sm", "lg"])("--ui-shadow-%s resolves to a drawn shadow", async (step) => {
      await applyTheme(theme);
      expect(tokenAsValue("box-shadow", `--ui-shadow-${step}`)).not.toBe("none");
    });

    it.each(["xs", "md", "xl", "inner"])("--ui-shadow-%s is gone", async (step) => {
      await applyTheme(theme);
      expect(getComputedStyle(document.documentElement).getPropertyValue(`--ui-shadow-${step}`))
        .toBe("");
    });
  });

  describe("motion", () => {
    // Three durations; no curve may overshoot.
    // Read raw: the browser project disables every transition, so a computed
    // duration is always 0s (testing.md, trap 10).
    it.each([["instant", "80ms"], ["fast", "150ms"], ["overlay", "200ms"]])(
      "--ui-duration-%s is %s",
      async (step, value) => {
        await applyTheme(theme);
        expect(rawToken(`--ui-duration-${step}`)).toBe(value);
      },
    );

    it.each(["out", "in-out"])("--ui-ease-%s stays inside 0–1 on the progress axis", async (step) => {
      await applyTheme(theme);
      const curve = rawToken(`--ui-ease-${step}`);
      const [, y1, , y2] = curve.match(/cubic-bezier\(([^)]+)\)/)![1].split(",").map(Number);
      for (const y of [y1, y2]) {
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("tracking", () => {
    it.each([["tight", "-0.01em"], ["caps", "0.04em"]])("--ui-tracking-%s is %s", async (step, em) => {
      await applyTheme(theme);
      // At a 100px font-size an em is 100px, so the computed length reads as the em value.
      const probe = document.createElement("span");
      probe.style.fontSize = "100px";
      probe.style.letterSpacing = `var(--ui-tracking-${step})`;
      document.body.append(probe);
      expect(getComputedStyle(probe).letterSpacing).toBe(`${parseFloat(em) * 100}px`);
      probe.remove();
    });
  });
});
