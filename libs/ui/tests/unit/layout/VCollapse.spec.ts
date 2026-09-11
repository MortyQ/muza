import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VCollapse from "../../../src/components/layout/VCollapse.vue";

/**
 * The height animation is `grid-template-rows: 0fr → 1fr` and belongs to the
 * browser project — jsdom computes no layout. What is testable here is the state
 * the CSS keys off: the modifier class, the duration variable, whether the
 * content is in the DOM, and the aria flag.
 */
function collapse(props: Record<string, unknown> = {}, content = "<p class='inner'>Body</p>") {
  return mount(VCollapse, { props, slots: { default: content } });
}

describe("VCollapse", () => {
  it("starts collapsed", () => {
    const w = collapse();
    expect(w.classes()).not.toContain("v-collapse--expanded");
  });

  it("adds the expanded modifier when the model is true", () => {
    expect(collapse({ modelValue: true }).classes()).toContain("v-collapse--expanded");
  });

  it("follows the model rather than owning the state", async () => {
    const w = collapse({ modelValue: false });
    await w.setProps({ modelValue: true });
    expect(w.classes()).toContain("v-collapse--expanded");
    await w.setProps({ modelValue: false });
    expect(w.classes()).not.toContain("v-collapse--expanded");
  });

  it("hands the duration to CSS as a custom property", () => {
    expect(collapse().attributes("style")).toContain("--v-collapse-duration: 200ms");
    expect(collapse({ duration: 80 }).attributes("style")).toContain("--v-collapse-duration: 80ms");
  });

  describe("content mounting", () => {
    it("keeps the content mounted while collapsed by default", () => {
      // This is what makes a lazily-loaded chart inside stay loaded after the
      // first expand.
      expect(collapse({ modelValue: false }).find(".inner").exists()).toBe(true);
    });

    it("hides the collapsed content from assistive tech", () => {
      const content = collapse({ modelValue: false }).find(".v-collapse__content");
      expect(content.attributes("aria-hidden")).toBe("true");
    });

    it("stops hiding it once expanded", () => {
      const content = collapse({ modelValue: true }).find(".v-collapse__content");
      expect(content.attributes("aria-hidden")).toBe("false");
    });

    it("removes the content entirely when unmount is set", () => {
      expect(collapse({ modelValue: false, unmount: true }).find(".inner").exists()).toBe(false);
      expect(collapse({ modelValue: true, unmount: true }).find(".inner").exists()).toBe(true);
    });

    it("re-mounts on expand and drops it again on collapse", async () => {
      const w = collapse({ modelValue: false, unmount: true });
      await w.setProps({ modelValue: true });
      expect(w.find(".inner").exists()).toBe(true);
      await w.setProps({ modelValue: false });
      expect(w.find(".inner").exists()).toBe(false);
    });
  });

  it("renders no header, button or chevron of its own", () => {
    // The distinction from VAccordion: the trigger lives in the consumer, which
    // is what lets a card header hold interactive children.
    const w = collapse({ modelValue: true });
    expect(w.find("button").exists()).toBe(false);
    expect(w.find("svg").exists()).toBe(false);
  });
});
