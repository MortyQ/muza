import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VAnimatedBackground from "../../../src/components/layout/VAnimatedBackground.vue";

const blobs = (w: ReturnType<typeof mount>) => w.findAll(".v-animated-background__blob");

/**
 * The motion is a CSS animation, which jsdom neither runs nor lays out. What is
 * worth asserting here is the structure and what each blob hands to CSS.
 */
describe("VAnimatedBackground", () => {
  it("renders a blob layer and a tint layer", () => {
    const w = mount(VAnimatedBackground);
    expect(w.find(".v-animated-background").exists()).toBe(true);
    expect(w.find(".v-animated-background__tint").exists()).toBe(true);
  });

  it("hides its blobs from assistive technology", () => {
    const layer = mount(VAnimatedBackground).find(".v-animated-background");
    expect(layer.attributes("aria-hidden")).toBe("true");
  });

  it("renders one blob per `count`", () => {
    expect(blobs(mount(VAnimatedBackground, { props: { count: 3 } }))).toHaveLength(3);
    expect(blobs(mount(VAnimatedBackground))).toHaveLength(15);
  });

  it("hands each blob to CSS as custom properties only, never as inline style", () => {
    for (const blob of blobs(mount(VAnimatedBackground, { props: { count: 4 } }))) {
      const style = (blob.element as HTMLElement).style;
      const names = Array.from({ length: style.length }, (_, i) => style.item(i));
      expect(names.length).toBeGreaterThan(0);
      expect(names.every(name => name.startsWith("--v-blob-")), names.join(", ")).toBe(true);
    }
    const tint = mount(VAnimatedBackground).find(".v-animated-background__tint");
    expect(tint.attributes("style")).toBeUndefined();
  });

  it("sizes a blob from its radius range", () => {
    const props = { count: 1, minRadius: 50, maxRadius: 0 };
    const [blob] = blobs(mount(VAnimatedBackground, { props }));
    expect((blob.element as HTMLElement).style.getPropertyValue("--v-blob-size")).toBe("100px");
  });

  it("keeps an rgb colour's hue at the canvas's alphas", () => {
    const [blob] = blobs(mount(VAnimatedBackground, { props: { count: 1, colors: ["rgba(10, 20, 30, 0.3)"] } }));
    const style = (blob.element as HTMLElement).style;
    expect(style.getPropertyValue("--v-blob-core")).toBe("rgba(10, 20, 30, 0.5)");
    expect(style.getPropertyValue("--v-blob-halo")).toBe("rgba(10, 20, 30, 0.25)");
  });

  it("mixes any other colour toward transparent, so tokens work too", () => {
    const [blob] = blobs(mount(VAnimatedBackground, { props: { count: 1, colors: ["var(--ui-primary)"] } }));
    expect((blob.element as HTMLElement).style.getPropertyValue("--v-blob-core"))
      .toBe("color-mix(in oklch, var(--ui-primary) 50%, transparent)");
  });

  it("holds still at speed 0", () => {
    const [blob] = blobs(mount(VAnimatedBackground, { props: { count: 1, speed: 0 } }));
    expect((blob.element as HTMLElement).style.getPropertyValue("--v-blob-play")).toBe("paused");
  });
});
