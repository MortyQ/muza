import { describe, expect, it } from "vitest";

import VButton from "../../../../src/components/base/VButton.vue";
import { stage } from "../../../setup/stage";
import { THEME_CASES } from "../../../setup/theme";

const VARIANTS = [
  "primary",
  "secondary",
  "positive",
  "negative",
  "warning",
  "link",
] as const;

describe.each(THEME_CASES)("VButton screenshots — %s theme", (theme) => {
  it.each(VARIANTS)("%s", async (variant) => {
    const frame = await stage(VButton, {
      theme,
      props: { text: "Button", variant },
    });
    await expect(frame).toMatchScreenshot(`vbutton-${variant}-${theme}`);
  });

  it("icon only", async () => {
    const frame = await stage(VButton, {
      theme,
      props: { icon: "lucide:plus" },
      width: 120,
    });
    await expect(frame).toMatchScreenshot(`vbutton-icon-only-${theme}`);
  });

  it("with leading icon", async () => {
    const frame = await stage(VButton, {
      theme,
      props: { icon: "lucide:plus", text: "Add item" },
    });
    await expect(frame).toMatchScreenshot(`vbutton-icon-text-${theme}`);
  });

  it("disabled", async () => {
    const frame = await stage(VButton, {
      theme,
      props: { text: "Button", disabled: true },
    });
    await expect(frame).toMatchScreenshot(`vbutton-disabled-${theme}`);
  });

  it("loading", async () => {
    const frame = await stage(VButton, {
      theme,
      props: { text: "Saving", loading: true },
    });
    await expect(frame).toMatchScreenshot(`vbutton-loading-${theme}`);
  });
});
