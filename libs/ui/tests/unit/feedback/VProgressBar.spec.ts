import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VIcon from "../../../src/components/base/VIcon.vue";
import VProgressBar from "../../../src/components/feedback/VProgressBar.vue";

const stubs = { Icon: true };

function bar(props: Record<string, unknown>) {
  return mount(VProgressBar, { props, global: { stubs } });
}

describe("VProgressBar", () => {
  describe("clamping", () => {
    it.each([
      [0, "0%"],
      [42, "42%"],
      [100, "100%"],
      [-1, "0%"],
      [-999, "0%"],
      [101, "100%"],
      [1e6, "100%"],
    ])("percentage %d renders as %s", (percentage, expected) => {
      const w = bar({ percentage });
      expect(w.attributes("style")).toContain(`--v-progress-value: ${expected}`);
    });

    it("hands the value to CSS as a variable, never as a width", () => {
      const style = bar({ percentage: 42 }).attributes("style");
      expect(style).toContain("--v-progress-value");
      expect(style).not.toContain("width");
    });

    it("keeps fractional values intact for CSS but rounds the label", () => {
      const w = bar({ percentage: 42.6 });
      expect(w.attributes("style")).toContain("--v-progress-value: 42.6%");
      expect(w.find(".v-progress-bar__percentage").text()).toBe("43%");
    });
  });

  describe("completion", () => {
    it("is not complete below 100", () => {
      const w = bar({ percentage: 99.9 });
      expect(w.classes()).not.toContain("v-progress-bar--completed");
      expect(w.find(".v-progress-bar__shine").exists()).toBe(true);
      expect(w.findAllComponents(VIcon)).toHaveLength(0);
    });

    it("is complete at exactly 100", () => {
      const w = bar({ percentage: 100 });
      expect(w.classes()).toContain("v-progress-bar--completed");
    });

    it("stops the shine and shows a tick once complete", () => {
      const w = bar({ percentage: 100 });
      expect(w.find(".v-progress-bar__shine").exists()).toBe(false);
      expect(w.findComponent(VIcon).props().icon).toBe("lucide:check-circle");
    });

    it("treats an over-100 value as complete", () => {
      expect(bar({ percentage: 150 }).classes()).toContain("v-progress-bar--completed");
    });
  });

  describe("accessibility", () => {
    it("exposes a progressbar role with the rounded value", () => {
      const track = bar({ percentage: 42.6 }).find(".v-progress-bar__track");
      expect(track.attributes("role")).toBe("progressbar");
      expect(track.attributes("aria-valuenow")).toBe("43");
      expect(track.attributes("aria-valuemin")).toBe("0");
      expect(track.attributes("aria-valuemax")).toBe("100");
    });

    it("reports the clamped value, not the raw one", () => {
      const track = bar({ percentage: 500 }).find(".v-progress-bar__track");
      expect(track.attributes("aria-valuenow")).toBe("100");
    });
  });

  describe("header", () => {
    it("shows the percentage by default", () => {
      expect(bar({ percentage: 30 }).find(".v-progress-bar__percentage").text()).toBe("30%");
    });

    it("hides the header entirely with no step and no percentage", () => {
      const w = bar({ percentage: 30, showPercentage: false });
      expect(w.find(".v-progress-bar__header").exists()).toBe(false);
    });

    it("keeps the header for a step even without the percentage", () => {
      const w = bar({ percentage: 30, step: "Uploading", showPercentage: false });
      expect(w.find(".v-progress-bar__step").text()).toBe("Uploading");
      expect(w.find(".v-progress-bar__percentage").exists()).toBe(false);
    });

    it("renders both together", () => {
      const w = bar({ percentage: 30, step: "Uploading" });
      expect(w.find(".v-progress-bar__step").text()).toBe("Uploading");
      expect(w.find(".v-progress-bar__percentage").text()).toBe("30%");
    });

    it("treats an empty step as absent", () => {
      const w = bar({ percentage: 30, step: "" });
      expect(w.find(".v-progress-bar__step").exists()).toBe(false);
    });
  });

  it.each(["sm", "md", "lg"] as const)("applies the %s size class", (size) => {
    expect(bar({ percentage: 50, size }).classes()).toContain(`v-progress-bar--${size}`);
  });

  it("reacts to a changing percentage", async () => {
    const w = bar({ percentage: 10 });
    await w.setProps({ percentage: 90 });
    expect(w.attributes("style")).toContain("--v-progress-value: 90%");
    expect(w.find(".v-progress-bar__track").attributes("aria-valuenow")).toBe("90");
  });
});
