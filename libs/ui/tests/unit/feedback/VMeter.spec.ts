import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VIcon from "../../../src/components/base/VIcon.vue";
import VMeter from "../../../src/components/feedback/VMeter.vue";

const stubs = { Icon: true };

function meter(props: Record<string, unknown>, slots: Record<string, string> = {}) {
  return mount(VMeter, { props, slots, global: { stubs } });
}

const fill = (w: ReturnType<typeof meter>) => w.find(".v-meter__fill");
const track = (w: ReturnType<typeof meter>) => w.find(".v-meter__track");
const icon = (w: ReturnType<typeof meter>) => w.findComponent(VIcon);

describe("VMeter", () => {
  describe("goal: reach (a floor)", () => {
    it("is met at or above max", () => {
      expect(fill(meter({ value: 100, max: 100 })).classes()).toContain("v-meter__fill--met");
      expect(fill(meter({ value: 150, max: 100 })).classes()).toContain("v-meter__fill--met");
    });

    it("is unmet below max", () => {
      expect(fill(meter({ value: 99, max: 100 })).classes()).toContain("v-meter__fill--unmet");
    });
  });

  describe("goal: stay-under (a ceiling)", () => {
    const goal = "stay-under";

    it("is met at or below max", () => {
      expect(fill(meter({ value: 100, max: 100, goal })).classes()).toContain("v-meter__fill--met");
      expect(fill(meter({ value: 10, max: 100, goal })).classes()).toContain("v-meter__fill--met");
    });

    it("is unmet above max", () => {
      expect(fill(meter({ value: 101, max: 100, goal })).classes())
        .toContain("v-meter__fill--unmet");
    });
  });

  describe("fill ratio", () => {
    it("is the value over max", () => {
      expect(fill(meter({ value: 25, max: 100 })).attributes("style"))
        .toContain("--v-meter-fill: 0.25");
    });

    it("clamps at 1 rather than overflowing the track", () => {
      expect(fill(meter({ value: 400, max: 100 })).attributes("style"))
        .toContain("--v-meter-fill: 1");
    });

    it("is 0 when max is 0, not Infinity", () => {
      // A threshold of zero has no bar to fill, and the division would blow up.
      expect(fill(meter({ value: 5, max: 0 })).attributes("style"))
        .toContain("--v-meter-fill: 0");
    });

    it("is 0 for a negative max too", () => {
      expect(fill(meter({ value: 5, max: -10 })).attributes("style"))
        .toContain("--v-meter-fill: 0");
    });
  });

  describe("the track", () => {
    it.each(["sm", "md"] as const)("carries its %s size class", (size) => {
      expect(track(meter({ value: 1, max: 2, size })).classes())
        .toContain(`v-meter__track--${size}`);
    });

    it("defaults to sm", () => {
      expect(track(meter({ value: 1, max: 2 })).classes()).toContain("v-meter__track--sm");
    });

    it("is absent when the value could not be measured", () => {
      expect(track(meter({ value: null, max: 100 })).exists()).toBe(false);
    });

    it("stays mounted at zero fill while pending", () => {
      // The row keeps its height from the first frame, so an arriving value
      // animates in instead of shoving the layout down.
      const w = meter({ value: null, max: 100, pending: true });
      expect(track(w).exists()).toBe(true);
      expect(fill(w).attributes("style")).toContain("--v-meter-fill: 0");
    });

    it("exposes the measurement through the meter role", () => {
      const el = fill(meter({ value: 30, max: 120 }));
      expect(el.attributes("role")).toBe("meter");
      expect(el.attributes("aria-valuenow")).toBe("30");
      expect(el.attributes("aria-valuemin")).toBe("0");
      expect(el.attributes("aria-valuemax")).toBe("120");
    });

    it("omits aria-valuenow when there is no measurement", () => {
      const w = meter({ value: null, max: 100, pending: true });
      expect(fill(w).attributes("aria-valuenow")).toBeUndefined();
    });
  });

  describe("the label", () => {
    it("falls back to `value / max` with thousands separators", () => {
      expect(meter({ value: 12345, max: 100000 }).text()).toContain("12,345 / 100,000");
    });

    it("says so when the value is null", () => {
      expect(meter({ value: null, max: 100 }).text()).toContain("Not measured");
    });

    it("prefers the label prop", () => {
      expect(meter({ value: 1, max: 2, label: "1 of 2 tokens" }).text()).toContain("1 of 2 tokens");
    });

    it("prefers the slot over both", () => {
      const w = meter({ value: 1, max: 2, label: "ignored" }, { label: "<b>markup</b>" });
      expect(w.text()).toContain("markup");
      expect(w.text()).not.toContain("ignored");
    });

    it("takes the help cursor only when there is a hint to show", () => {
      expect(meter({ value: 1, max: 2 }).find(".v-meter__value").classes())
        .not.toContain("v-meter__value--help");
      expect(meter({ value: 1, max: 2, hint: "why" }).find(".v-meter__value").classes())
        .toContain("v-meter__value--help");
    });

    it("recesses while pending", () => {
      expect(meter({ value: null, max: 2, pending: true }).find(".v-meter__value").classes())
        .toContain("v-meter__value--pending");
    });
  });

  describe("the state icon", () => {
    it("is a check when met", () => {
      const w = meter({ value: 10, max: 5 });
      expect(icon(w).props("icon")).toBe("lucide:circle-check");
      expect(icon(w).classes()).toContain("v-meter__icon--met");
    });

    it("is a warning triangle when unmet", () => {
      const w = meter({ value: 1, max: 5 });
      expect(icon(w).props("icon")).toBe("lucide:triangle-alert");
      expect(icon(w).classes()).toContain("v-meter__icon--unmet");
    });

    it("is a question mark, untinted, when unmeasured", () => {
      const w = meter({ value: null, max: 5 });
      expect(icon(w).props("icon")).toBe("lucide:circle-help");
      expect(icon(w).classes()).not.toContain("v-meter__icon--unmet");
      expect(icon(w).classes()).not.toContain("v-meter__icon--met");
    });

    it("becomes the spinner while pending, whatever the value says", () => {
      // `pending` and `value === null` are different things: one resolves, the
      // other does not — and pending wins over both state icons.
      const w = meter({ value: 1, max: 5, pending: true });
      expect(icon(w).props("loading")).toBe(true);
    });
  });
});
