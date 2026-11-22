import { describe, expect, it } from "vitest";

import { applyTheme, THEME_CASES } from "../../setup/theme";
import { tokenAsValue } from "../../setup/tokens";

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
});
