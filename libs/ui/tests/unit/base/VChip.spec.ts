import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VChip, { type ChipColor, type ChipSize, type ChipVariant } from "../../../src/components/base/VChip.vue";
import VIcon from "../../../src/components/base/VIcon.vue";

const VARIANTS: ChipVariant[] = ["filled", "outlined", "soft"];
const COLORS: ChipColor[] = ["default", "primary", "success", "warning", "danger", "info", "neutral"];
const SIZES: ChipSize[] = ["sm", "md", "lg"];

const stubs = { Icon: true };

function chip(props: Record<string, unknown> = {}) {
  return mount(VChip, { props, global: { stubs } });
}

describe("VChip", () => {
  it("renders the label", () => {
    expect(chip({ label: "Design" }).text()).toBe("Design");
  });

  it("omits the label element entirely when there is nothing to show", () => {
    expect(chip({}).find(".v-chip__label").exists()).toBe(false);
  });

  it.each(SIZES)("applies the %s size class", (size) => {
    expect(chip({ size }).classes()).toContain(`v-chip--${size}`);
  });

  it.each(VARIANTS)("applies the %s variant class", (variant) => {
    expect(chip({ variant }).classes()).toContain(`v-chip--${variant}`);
  });

  it.each(COLORS)("applies the %s colour class when unselected", (color) => {
    expect(chip({ color }).classes()).toContain(`v-chip--color-${color}`);
  });

  describe("selection colour", () => {
    it("keeps `default` neutral while unselected", () => {
      expect(chip({ color: "default" }).classes()).toContain("v-chip--color-default");
    });

    it("borrows selectedColor once `default` is selected", () => {
      const w = chip({ color: "default", selectedColor: "success", active: true });
      expect(w.classes()).toContain("v-chip--color-success");
      expect(w.classes()).toContain("v-chip--selected");
    });

    it("leaves an explicit colour alone when selected", () => {
      const w = chip({ color: "info", selectedColor: "success", active: true });
      expect(w.classes()).toContain("v-chip--color-info");
    });
  });

  describe("unbound selection", () => {
    it("reflects the active prop", () => {
      expect(chip({ active: true }).classes()).toContain("v-chip--selected");
      expect(chip({ active: false }).classes()).not.toContain("v-chip--selected");
    });

    it("still emits click", async () => {
      const w = chip({ label: "Design" });
      await w.trigger("click");
      expect(w.emitted("click")).toHaveLength(1);
    });
  });

  describe("single-select binding", () => {
    it("marks itself selected when the model matches its value", () => {
      expect(chip({ value: "a", modelValue: "a" }).classes()).toContain("v-chip--selected");
      expect(chip({ value: "a", modelValue: "b" }).classes()).not.toContain("v-chip--selected");
    });

    it("selects itself on click", async () => {
      const w = chip({ value: "a", modelValue: null });
      await w.trigger("click");
      expect(w.emitted("update:modelValue")?.[0]).toEqual(["a"]);
    });

    it("deselects to null when clicked while selected", async () => {
      const w = chip({ value: "a", modelValue: "a" });
      await w.trigger("click");
      expect(w.emitted("update:modelValue")?.[0]).toEqual([null]);
    });

    it("ignores the active prop once bound", () => {
      const w = chip({ value: "a", modelValue: "b", active: true });
      expect(w.classes()).not.toContain("v-chip--selected");
    });
  });

  describe("multi-select binding", () => {
    it("is selected when its value is in the array", () => {
      const w = chip({ value: "a", modelValue: ["a", "b"], multiple: true });
      expect(w.classes()).toContain("v-chip--selected");
    });

    it("appends its value on click", async () => {
      const w = chip({ value: "c", modelValue: ["a"], multiple: true });
      await w.trigger("click");
      expect(w.emitted("update:modelValue")?.[0]).toEqual([["a", "c"]]);
    });

    it("removes its value when already selected", async () => {
      const w = chip({ value: "a", modelValue: ["a", "b"], multiple: true });
      await w.trigger("click");
      expect(w.emitted("update:modelValue")?.[0]).toEqual([["b"]]);
    });

    it("copes with a non-array model", async () => {
      const w = chip({ value: "a", modelValue: null, multiple: true });
      await w.trigger("click");
      expect(w.emitted("update:modelValue")?.[0]).toEqual([["a"]]);
    });
  });

  describe("disabled", () => {
    it("carries the disabled class and drops the interactive one", () => {
      const classes = chip({ disabled: true }).classes();
      expect(classes).toContain("v-chip--disabled");
      expect(classes).not.toContain("v-chip--interactive");
    });

    it("emits nothing on click", async () => {
      const w = chip({ disabled: true, value: "a", modelValue: null });
      await w.trigger("click");
      expect(w.emitted("click")).toBeUndefined();
      expect(w.emitted("update:modelValue")).toBeUndefined();
    });

    it("blocks the close button too", async () => {
      const w = chip({ disabled: true, closable: true });
      await w.find(".v-chip__close").trigger("click");
      expect(w.emitted("close")).toBeUndefined();
    });
  });

  describe("closable", () => {
    it("renders the close button only when asked", () => {
      expect(chip({}).find(".v-chip__close").exists()).toBe(false);
      expect(chip({ closable: true }).find(".v-chip__close").exists()).toBe(true);
    });

    it("emits close without also emitting click", async () => {
      const w = chip({ closable: true, label: "Design" });
      await w.find(".v-chip__close").trigger("click");
      expect(w.emitted("close")).toHaveLength(1);
      expect(w.emitted("click")).toBeUndefined();
    });

    it("does not toggle the model when closing", async () => {
      const w = chip({ closable: true, value: "a", modelValue: null });
      await w.find(".v-chip__close").trigger("click");
      expect(w.emitted("update:modelValue")).toBeUndefined();
    });
  });

  describe("badge", () => {
    it("renders a VTag when a badge is given", () => {
      const w = chip({ label: "Design", badge: "3" });
      expect(w.find(".vtag").text()).toBe("3");
    });

    it("renders no badge otherwise", () => {
      expect(chip({ label: "Design" }).find(".vtag").exists()).toBe(false);
    });

    it("lets the badge slot take over", () => {
      const w = mount(VChip, {
        props: { label: "Design", badge: "3" },
        slots: { badge: "<b class='custom-badge'>!</b>" },
        global: { stubs },
      });
      expect(w.find(".custom-badge").exists()).toBe(true);
      expect(w.find(".vtag").exists()).toBe(false);
    });
  });

  describe("icon", () => {
    it("renders when given", () => {
      expect(chip({ icon: "lucide:star" }).find(".v-chip__icon").exists()).toBe(true);
    });

    it("scales with the chip size", () => {
      const expected = { sm: 14, md: 16, lg: 18 } as const;
      for (const size of SIZES) {
        const w = chip({ icon: "lucide:star", size });
        expect(w.findComponent(VIcon).props().size).toBe(expected[size]);
      }
    });

    it("shrinks the close icon relative to the chip icon", () => {
      const w = chip({ icon: "lucide:star", closable: true, size: "md" });
      const sizes = w.findAllComponents(VIcon).map(i => i.props().size);
      expect(sizes).toEqual([16, 14]);
    });
  });
});
