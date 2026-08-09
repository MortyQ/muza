import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VIcon from "../../../src/components/base/VIcon.vue";
import VToggleGroup, { type ToggleOption } from "../../../src/components/inputs/VToggleGroup.vue";
import VTooltip from "../../../src/components/overlay/VTooltip.vue";

const OPTIONS: ToggleOption[] = [
  { label: "List", value: "list", icon: "lucide:list", tooltip: "List view" },
  { label: "Grid", value: "grid", icon: "lucide:grid-3x3" },
  { label: "Map", value: "map", disabled: true },
];

const stubs = { Icon: true };

function group(props: Record<string, unknown> = {}) {
  return mount(VToggleGroup, {
    props: { options: OPTIONS, modelValue: "list", ...props },
    global: { stubs },
  });
}

const items = (w: ReturnType<typeof group>) => w.findAll(".v-tg__item");

describe("VToggleGroup", () => {
  it("renders one button per option", () => {
    expect(items(group())).toHaveLength(3);
    expect(items(group()).map(b => b.text())).toEqual(["List", "Grid", "Map"]);
  });

  it("marks the active option and mirrors it in aria-pressed", () => {
    const w = group({ modelValue: "grid" });
    expect(items(w).map(b => b.classes().includes("v-tg__item--active")))
      .toEqual([false, true, false]);
    expect(items(w).map(b => b.attributes("aria-pressed")))
      .toEqual(["false", "true", "false"]);
  });

  it("emits the clicked value", async () => {
    const w = group();
    await items(w)[1].trigger("click");
    expect(w.emitted("update:modelValue")?.[0]).toEqual(["grid"]);
  });

  it("ignores a disabled option", async () => {
    const w = group();
    expect(items(w)[2].attributes("disabled")).toBeDefined();
    await items(w)[2].trigger("click");
    expect(w.emitted("update:modelValue")).toBeUndefined();
  });

  describe("tooltips", () => {
    it("wraps every option, but only enables the ones with text", () => {
      const tooltips = group().findAllComponents(VTooltip);
      expect(tooltips).toHaveLength(3);
      expect(tooltips[0].props().disabled).toBe(false);
      expect(tooltips[1].props().disabled).toBe(true);
    });

    it("passes the tooltip text through", () => {
      expect(group().findAllComponents(VTooltip)[0].props().text).toBe("List view");
    });

    it("falls back to an empty string rather than undefined", () => {
      expect(group().findAllComponents(VTooltip)[1].props().text).toBe("");
    });
  });

  describe("appearance", () => {
    it.each(["sm", "md", "lg"] as const)("size %s", (size) => {
      expect(group({ size }).classes()).toContain(`v-toggle-group--${size}`);
    });

    it.each([
      ["sm", 12],
      ["md", 16],
      ["lg", 20],
    ] as const)("scales the icon for size %s", (size, expected) => {
      expect(group({ size }).findComponent(VIcon).props().size).toBe(expected);
    });

    it("renders icons only for options that declare one", () => {
      expect(group().findAllComponents(VIcon)).toHaveLength(2);
    });
  });

  it("carries numeric values through unchanged", async () => {
    const w = mount(VToggleGroup, {
      props: { options: [{ label: "One", value: 1 }, { label: "Two", value: 2 }], modelValue: 1 },
      global: { stubs },
    });
    await w.findAll(".v-tg__item")[1].trigger("click");
    expect(w.emitted("update:modelValue")?.[0]).toEqual([2]);
  });
});
