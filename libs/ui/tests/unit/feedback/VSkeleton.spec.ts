import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VSkeleton from "../../../src/components/feedback/VSkeleton.vue";

function skeleton(props: Record<string, unknown> = {}) {
  return mount(VSkeleton, { props });
}

describe("VSkeleton", () => {
  it("is a base-size line by default", () => {
    const classes = skeleton().classes();
    expect(classes).toContain("v-skeleton--line");
    expect(classes).toContain("v-skeleton--base");
  });

  it("is hidden from assistive technology — the loading region announces itself", () => {
    expect(skeleton().attributes("aria-hidden")).toBe("true");
  });

  it.each(["xs", "sm", "base", "lg", "xl", "2xl", "3xl"] as const)("a line takes the %s step", (size) => {
    expect(skeleton({ size }).classes()).toContain(`v-skeleton--${size}`);
  });

  it.each(["disc", "block"] as const)("a %s ignores the type step", (shape) => {
    const classes = skeleton({ shape, size: "xl" }).classes();
    expect(classes).toContain(`v-skeleton--${shape}`);
    expect(classes).not.toContain("v-skeleton--xl");
  });

  it("hands width and height to CSS as custom properties", () => {
    const style = skeleton({ shape: "block", width: "8rem", height: "3rem" }).attributes("style");
    expect(style).toContain("--v-skeleton-width: 8rem");
    expect(style).toContain("--v-skeleton-height: 3rem");
  });

  it("leaves the style attribute off when no box is given", () => {
    expect(skeleton().attributes("style")).toBeUndefined();
  });
});
