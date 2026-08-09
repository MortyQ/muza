import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VIcon from "../../../../src/components/base/VIcon.vue";
import DeltaIndicator from "../../../../src/components/table/components/DeltaIndicator.vue";
import DeltaValue from "../../../../src/components/table/components/DeltaValue.vue";

/**
 * Both components turn a signed number into a tone — colour class plus arrow —
 * and both take a `reverse` flag for metrics where down is good. Getting the
 * reversal wrong paints a rise in costs green, which is the kind of defect that
 * survives review because the component still "works".
 *
 * They do not share a formatter: DeltaIndicator delegates to `@muzakit/utils`
 * with the same option shape as a column, DeltaValue has its own Intl calls and
 * its own narrower option shape. Both are covered rather than assumed equal.
 */

const stubs = { Icon: true };

const arrow = (w: ReturnType<typeof mount>) =>
  (w.findComponent(VIcon).exists() ? w.findComponent(VIcon).props("icon") : null);

describe("DeltaValue", () => {
  const delta = (props: Record<string, unknown> = {}) =>
    mount(DeltaValue, { props, global: { stubs } });

  describe("the main value", () => {
    it("renders nothing when absent", () => {
      expect(delta().find(".v-delta-value__main").exists()).toBe(false);
    });

    it("renders a number with thousands separators", () => {
      expect(delta({ value: 12345 }).find(".v-delta-value__main").text()).toBe("12,345");
    });

    it("passes a string through untouched", () => {
      expect(delta({ value: "n/a" }).find(".v-delta-value__main").text()).toBe("n/a");
    });

    it("renders zero rather than treating it as absent", () => {
      expect(delta({ value: 0 }).find(".v-delta-value__main").text()).toBe("0");
    });

    it("formats as currency", () => {
      expect(delta({ value: 1250, format: { type: "currency" } })
        .find(".v-delta-value__main").text()).toBe("$1,250");
    });

    it("takes a currency code", () => {
      expect(delta({ value: 1250, format: { type: "currency", currencyCode: "EUR" } })
        .find(".v-delta-value__main").text()).toContain("€");
    });

    it("formats as a percentage", () => {
      expect(delta({ value: 42, format: { type: "percentage", decimals: 1 } })
        .find(".v-delta-value__main").text()).toBe("42.0%");
    });

    it("honours decimals", () => {
      expect(delta({ value: 12.3456, format: { decimals: 2 } })
        .find(".v-delta-value__main").text()).toBe("12.35");
    });
  });

  describe("the delta", () => {
    it("is absent when not given", () => {
      expect(delta({ value: 10 }).find(".v-delta").exists()).toBe(false);
    });

    it("renders as a percentage by default", () => {
      expect(delta({ delta: 12.5 }).find(".v-delta__text").text()).toBe("13%");
    });

    it("drops the percent sign when asked", () => {
      expect(delta({ delta: 12, deltaAsPercentage: false }).find(".v-delta__text").text())
        .toBe("12");
    });

    it("shows the magnitude, leaving direction to the arrow", () => {
      expect(delta({ delta: -12 }).find(".v-delta__text").text()).toBe("12%");
    });

    it("shows a zero delta by default", () => {
      expect(delta({ delta: 0 }).find(".v-delta").exists()).toBe(true);
    });

    it("hides a zero delta when asked", () => {
      expect(delta({ delta: 0, showZeroDelta: false }).find(".v-delta").exists()).toBe(false);
    });

    it("still shows a non-zero delta with showZeroDelta off", () => {
      expect(delta({ delta: 3, showZeroDelta: false }).find(".v-delta").exists()).toBe(true);
    });

    it("takes its own format independent of the main value's", () => {
      expect(delta({
        value: 100,
        format: { decimals: 0 },
        delta: 1250,
        deltaFormat: { type: "currency", decimals: 2 },
      }).find(".v-delta__text").text()).toBe("$1,250.00");
    });

    it("formats the delta as a percentage on request", () => {
      expect(delta({ delta: 12.34, deltaFormat: { type: "percentage", decimals: 1 } })
        .find(".v-delta__text").text()).toBe("12.3%");
    });
  });

  describe("tone", () => {
    it.each([
      [5, "v-delta--positive", "lucide:arrow-up"],
      [-5, "v-delta--negative", "lucide:arrow-down"],
      [0, "v-delta--zero", "lucide:minus"],
    ] as [number, string, string][])("%s → %s", (value, className, icon) => {
      const w = delta({ delta: value });
      expect(w.find(".v-delta").classes()).toContain(className);
      expect(arrow(w)).toBe(icon);
    });

    it("swaps positive and negative when reversed", () => {
      const w = delta({ delta: 5, reverse: true });
      expect(w.find(".v-delta").classes()).toContain("v-delta--negative");
      expect(arrow(w)).toBe("lucide:arrow-down");
    });

    it("leaves zero neutral when reversed", () => {
      expect(delta({ delta: 0, reverse: true }).find(".v-delta").classes())
        .toContain("v-delta--zero");
    });
  });

  describe("size", () => {
    it.each(["sm", "default", "lg"])("applies %s to the root", (size) => {
      expect(delta({ size }).classes()).toContain(`v-delta-value--${size}`);
    });

    it.each([["sm", 14], ["default", 16], ["lg", 20]] as [string, number][])(
      "scales the arrow for %s",
      (size, expected) => {
        expect(mount(DeltaValue, { props: { delta: 5, size }, global: { stubs } })
          .findComponent(VIcon).props("size")).toBe(expected);
      },
    );

    it("collapses lg onto the default delta size", () => {
      // Only the main value grows at `lg`; the delta stays readable next to it.
      expect(delta({ delta: 5, size: "lg" }).find(".v-delta").classes())
        .toContain("v-delta--default");
    });
  });
});

describe("DeltaIndicator", () => {
  const indicator = (props: Record<string, unknown> = {}) =>
    mount(DeltaIndicator, { props, global: { stubs } });

  describe("visibility", () => {
    it("renders zero by default", () => {
      expect(indicator({ value: 0 }).find(".v-delta").exists()).toBe(true);
    });

    it("hides zero when asked", () => {
      expect(indicator({ value: 0, showZero: false }).find(".v-delta").exists()).toBe(false);
    });

    it("defaults its value to zero", () => {
      expect(indicator().find(".v-delta__text").text()).toBe("0");
    });
  });

  describe("formatting", () => {
    it("stringifies without a format", () => {
      expect(indicator({ value: 1234.5 }).find(".v-delta__text").text()).toBe("1234.5");
    });

    it("formats as currency", () => {
      expect(indicator({ value: 1250, format: { currency: true } })
        .find(".v-delta__text").text()).toBe("$1,250");
    });

    it("takes a currency code as a string", () => {
      expect(indicator({ value: 1250, format: { currency: "EUR" } })
        .find(".v-delta__text").text()).toContain("€");
    });

    it("takes the object form with decimals", () => {
      expect(indicator({ value: 1250.5, format: { currency: { decimals: 2 } } })
        .find(".v-delta__text").text()).toBe("$1,250.50");
    });

    it("formats as a percentage", () => {
      expect(indicator({ value: 12.345, format: { percentage: { decimals: 1 } } })
        .find(".v-delta__text").text()).toBe("12.3%");
    });

    it("formats as a compact number", () => {
      expect(indicator({ value: 1500, format: { number: "compact" } })
        .find(".v-delta__text").text()).toBe("1.5K");
    });

    it("keeps the sign, unlike DeltaValue", () => {
      // The indicator stands alone, so the sign has to be legible from the text
      // as well as the arrow.
      expect(indicator({ value: -42 }).find(".v-delta__text").text()).toBe("-42");
    });
  });

  describe("tone", () => {
    it.each([
      [5, "v-delta--positive", "lucide:arrow-up"],
      [-5, "v-delta--negative", "lucide:arrow-down"],
      [0, "v-delta--zero", "lucide:minus"],
    ] as [number, string, string][])("%s → %s", (value, className, icon) => {
      const w = indicator({ value });
      expect(w.classes()).toContain(className);
      expect(arrow(w)).toBe(icon);
    });

    it("swaps positive and negative when reversed", () => {
      expect(indicator({ value: -5, reverse: true }).classes()).toContain("v-delta--positive");
    });
  });

  describe("the arrow", () => {
    it("can be turned off, leaving the colour to carry the meaning", () => {
      const w = indicator({ value: 5, showIcon: false });
      expect(w.findComponent(VIcon).exists()).toBe(false);
      expect(w.classes()).toContain("v-delta--positive");
    });

    it.each([["sm", 12], ["default", 14], ["lg", 18]] as [string, number][])(
      "scales for %s",
      (size, expected) => {
        expect(indicator({ value: 5, size }).findComponent(VIcon).props("size")).toBe(expected);
      },
    );
  });

  it.each(["sm", "default", "lg"])("applies the %s size class", (size) => {
    expect(indicator({ value: 1, size }).classes()).toContain(`v-delta--${size}`);
  });
});
