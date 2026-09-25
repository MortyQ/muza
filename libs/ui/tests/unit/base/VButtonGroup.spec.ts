import { defineComponent, h, inject } from "vue";

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import { BUTTON_GROUP_KEY } from "../../../src/components/base/injectionKeys";
import VButton from "../../../src/components/base/VButton.vue";
import VButtonGroup from "../../../src/components/base/VButtonGroup.vue";

/**
 * The group contributes layout and one provided flag; everything visual belongs
 * to the cells. So the contract worth asserting is the flag reaching the right
 * children and nothing else — the seam between the two files.
 */
function group(cells: number, props: Record<string, unknown> = {}) {
  return mount(VButtonGroup, {
    slots: {
      default: () => Array.from(
        { length: cells },
        (_, i) => h(VButton, { text: `Cell ${i}`, ...props }),
      ),
    },
  });
}

describe("VButtonGroup", () => {
  it("is a named group for assistive tech", () => {
    const w = mount(VButtonGroup, { attrs: { "aria-label": "Incident links" } });
    expect(w.attributes("role")).toBe("group");
    // The label falls through to the root — a role="group" with no name tells a
    // screen reader nothing about what it groups.
    expect(w.attributes("aria-label")).toBe("Incident links");
  });

  it("renders its slot content in order", () => {
    const w = group(3);
    const buttons = w.findAllComponents(VButton);
    expect(buttons).toHaveLength(3);
    expect(buttons.map(b => b.text())).toEqual(["Cell 0", "Cell 1", "Cell 2"]);
  });

  it("marks every child as a cell", () => {
    const w = group(3);
    for (const button of w.findAllComponents(VButton)) {
      expect(button.classes()).toContain("v-button--grouped");
    }
  });

  it("leaves each cell its own variant", () => {
    const w = mount(VButtonGroup, {
      slots: {
        default: () => [
          h(VButton, { text: "A", variant: "warning" }),
          h(VButton, { text: "B", variant: "neutral" }),
        ],
      },
    });
    const [a, b] = w.findAllComponents(VButton);
    expect(a.classes()).toContain("v-button--warning");
    expect(b.classes()).toContain("v-button--neutral");
  });

  it("provides the flag as `true`", () => {
    const Probe = defineComponent({
      setup() {
        const grouped = inject(BUTTON_GROUP_KEY, false);
        return () => h("span", { "data-grouped": String(grouped) });
      },
    });
    const w = mount(VButtonGroup, { slots: { default: () => h(Probe) } });
    expect(w.find("span").attributes("data-grouped")).toBe("true");
  });

  it("leaves a standalone button ungrouped", () => {
    // `inject` defaults to false outside a group, which is what keeps the whole
    // grouped stylesheet from applying to every button in the app.
    expect(mount(VButton, { props: { text: "Solo" } }).classes())
      .not.toContain("v-button--grouped");
  });
});
