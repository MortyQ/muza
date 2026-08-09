import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VIcon from "../../../src/components/base/VIcon.vue";
import VSegmentedControl, { type SegmentOption } from "../../../src/components/inputs/VSegmentedControl.vue";

const OPTIONS: SegmentOption[] = [
  { label: "Day", value: "day", icon: "lucide:sun" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month", disabled: true },
];

const stubs = { Icon: true };

function control(props: Record<string, unknown> = {}) {
  return mount(VSegmentedControl, {
    props: { options: OPTIONS, modelValue: "day", ...props },
    global: { stubs },
  });
}

const items = (w: ReturnType<typeof control>) => w.findAll(".v-sc__item");

describe("VSegmentedControl", () => {
  it("renders one button per option", () => {
    expect(items(control())).toHaveLength(3);
    expect(items(control()).map(b => b.text())).toEqual(["Day", "Week", "Month"]);
  });

  it("uses real buttons that will not submit a form", () => {
    for (const item of items(control())) {
      expect(item.element.tagName).toBe("BUTTON");
      expect(item.attributes("type")).toBe("button");
    }
  });

  it("marks the selected option active and pressed", () => {
    const w = control({ modelValue: "week" });
    expect(items(w).map(b => b.classes().includes("v-sc__item--active")))
      .toEqual([false, true, false]);
    expect(items(w).map(b => b.attributes("aria-pressed")))
      .toEqual(["false", "true", "false"]);
  });

  it("emits the clicked value", async () => {
    const w = control();
    await items(w)[1].trigger("click");
    expect(w.emitted("update:modelValue")?.[0]).toEqual(["week"]);
  });

  it("emits again for the already-selected option", async () => {
    // Deliberate: the control is a radio group, not a toggle, so re-selecting
    // is a no-op for the parent rather than something the child suppresses.
    const w = control({ modelValue: "day" });
    await items(w)[0].trigger("click");
    expect(w.emitted("update:modelValue")?.[0]).toEqual(["day"]);
  });

  describe("disabled", () => {
    it("disables a disabled option and emits nothing for it", async () => {
      const w = control();
      expect(items(w)[2].attributes("disabled")).toBeDefined();
      expect(items(w)[2].classes()).toContain("v-sc__item--disabled");

      await items(w)[2].trigger("click");
      expect(w.emitted("update:modelValue")).toBeUndefined();
    });

    it("a disabled control disables every option", async () => {
      const w = control({ disabled: true });
      for (const item of items(w)) {
        expect(item.attributes("disabled")).toBeDefined();
      }
      await items(w)[1].trigger("click");
      expect(w.emitted("update:modelValue")).toBeUndefined();
      expect(w.classes()).toContain("v-segmented-control--disabled");
    });
  });

  describe("appearance", () => {
    it.each(["sm", "md", "lg"] as const)("size %s", (size) => {
      expect(control({ size }).classes()).toContain(`v-segmented-control--${size}`);
    });

    it("full width is opt-in", () => {
      expect(control().classes()).not.toContain("v-segmented-control--full-width");
      expect(control({ fullWidth: true }).classes()).toContain("v-segmented-control--full-width");
    });

    it.each([
      ["sm", 14],
      ["md", 16],
      ["lg", 20],
    ] as const)("scales the icon for size %s", (size, expected) => {
      expect(control({ size }).findComponent(VIcon).props().size).toBe(expected);
    });

    it("renders an icon only for options that declare one", () => {
      expect(control().findAllComponents(VIcon)).toHaveLength(1);
    });
  });

  it("handles numeric values", async () => {
    const w = mount(VSegmentedControl, {
      props: { options: [{ label: "One", value: 1 }, { label: "Two", value: 2 }], modelValue: 1 },
      global: { stubs },
    });
    await w.findAll(".v-sc__item")[1].trigger("click");
    expect(w.emitted("update:modelValue")?.[0]).toEqual([2]);
  });
});
