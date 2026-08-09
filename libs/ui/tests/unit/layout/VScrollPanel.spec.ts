import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VScrollPanel from "../../../src/components/layout/VScrollPanel.vue";

describe("VScrollPanel", () => {
  it("renders its slot", () => {
    const w = mount(VScrollPanel, { slots: { default: "<p class='body'>Content</p>" } });
    expect(w.find(".body").text()).toBe("Content");
  });

  it("carries its own class", () => {
    expect(mount(VScrollPanel).classes()).toContain("v-scroll-panel");
  });

  it("sets no inline style without maxHeight", () => {
    expect(mount(VScrollPanel).attributes("style")).toBeUndefined();
  });

  it.each(["300px", "50vh", "clamp(200px, 40vh, 600px)"])(
    "hands maxHeight %s to CSS as a variable",
    (maxHeight) => {
      const w = mount(VScrollPanel, { props: { maxHeight } });
      const style = w.attributes("style") ?? "";
      expect(style).toContain(`--v-scroll-panel-max-height: ${maxHeight}`);
      // Not a plain `max-height:` declaration — the custom property's own name
      // ends in "max-height", so the check needs a declaration boundary.
      expect(style).not.toMatch(/(^|;)\s*max-height:/);
    },
  );
});
