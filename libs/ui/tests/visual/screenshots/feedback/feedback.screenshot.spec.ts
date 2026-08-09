import { describe, expect, it } from "vitest";

import VLoader from "../../../../src/components/feedback/VLoader.vue";
import VProgressBar from "../../../../src/components/feedback/VProgressBar.vue";
import { stage } from "../../../setup/stage";
import { THEME_CASES } from "../../../setup/theme";

describe.each(THEME_CASES)("feedback components — %s theme", (theme) => {
  describe("VLoader", () => {
    it.each(["sm", "md", "lg"] as const)("size %s", async (size) => {
      const frame = await stage(VLoader, { theme, props: { size }, width: 120 });
      await expect(frame).toMatchScreenshot(`vloader-${size}-${theme}`);
    });

    it.each(["secondary", "success", "warning", "danger", "info"] as const)("%s tone", async (variant) => {
      const frame = await stage(VLoader, { theme, props: { variant, size: "lg" }, width: 120 });
      await expect(frame).toMatchScreenshot(`vloader-${variant}-${theme}`);
    });

    it("with a message", async () => {
      const frame = await stage(VLoader, {
        theme,
        props: { message: "Loading products", size: "md" },
        width: 260,
      });
      await expect(frame).toMatchScreenshot(`vloader-message-${theme}`);
    });
  });

  describe("VProgressBar", () => {
    it.each([0, 42, 100])("at %i percent", async (percentage) => {
      const frame = await stage(VProgressBar, { theme, props: { percentage }, width: 360 });
      await expect(frame).toMatchScreenshot(`vprogressbar-${percentage}-${theme}`);
    });

    it.each(["sm", "md", "lg"] as const)("size %s", async (size) => {
      const frame = await stage(VProgressBar, {
        theme,
        props: { percentage: 60, size },
        width: 360,
      });
      await expect(frame).toMatchScreenshot(`vprogressbar-${size}-${theme}`);
    });

    it("with a step label", async () => {
      const frame = await stage(VProgressBar, {
        theme,
        props: { percentage: 65, step: "Uploading assets" },
        width: 360,
      });
      await expect(frame).toMatchScreenshot(`vprogressbar-step-${theme}`);
    });

    it("bare, without the header", async () => {
      const frame = await stage(VProgressBar, {
        theme,
        props: { percentage: 65, showPercentage: false },
        width: 360,
      });
      await expect(frame).toMatchScreenshot(`vprogressbar-bare-${theme}`);
    });
  });
});
