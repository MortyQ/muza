import { defineComponent, nextTick } from "vue";

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VCheckbox from "../../../src/components/inputs/VCheckbox.vue";

function checkbox(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(VCheckbox, { props, slots });
}

const input = (w: ReturnType<typeof checkbox>) => w.find("input");

describe("VCheckbox", () => {
  it("renders a checkbox input", () => {
    expect(input(checkbox()).attributes("type")).toBe("checkbox");
  });

  describe("boolean model", () => {
    it("reflects the model", () => {
      const checked = (value: boolean) =>
        (input(checkbox({ modelValue: value })).element as HTMLInputElement).checked;
      expect(checked(true)).toBe(true);
      expect(checked(false)).toBe(false);
    });

    it("emits the flipped value on change", async () => {
      const w = checkbox({ modelValue: false });
      await input(w).setValue(true);
      expect(w.emitted("update:modelValue")?.[0]).toEqual([true]);
    });

    it("emits false when unchecked", async () => {
      const w = checkbox({ modelValue: true });
      await input(w).setValue(false);
      expect(w.emitted("update:modelValue")?.[0]).toEqual([false]);
    });
  });

  describe("array model", () => {
    it("checks itself when its value is in the array", () => {
      const w = checkbox({ modelValue: ["a", "b"], value: "a" });
      expect((input(w).element as HTMLInputElement).checked).toBe(true);
    });

    it("stays unchecked when its value is absent", () => {
      const w = checkbox({ modelValue: ["b"], value: "a" });
      expect((input(w).element as HTMLInputElement).checked).toBe(false);
    });

    it("adds its value to the array", async () => {
      const w = checkbox({ modelValue: ["b"], value: "a" });
      await input(w).setValue(true);
      expect(w.emitted("update:modelValue")?.[0]).toEqual([["b", "a"]]);
    });

    it("removes its value from the array", async () => {
      const w = checkbox({ modelValue: ["a", "b"], value: "a" });
      await input(w).setValue(false);
      expect(w.emitted("update:modelValue")?.[0]).toEqual([["b"]]);
    });
  });

  describe("indeterminate", () => {
    it("is off by default", () => {
      expect((input(checkbox()).element as HTMLInputElement).indeterminate).toBe(false);
    });

    it("is set on the DOM node, since it has no attribute", async () => {
      // The watchEffect that writes it only re-runs once the template ref is
      // assigned, which happens during mount — so the flag lands a tick later.
      const w = checkbox({ indeterminate: true });
      await nextTick();
      expect((input(w).element as HTMLInputElement).indeterminate).toBe(true);
    });

    it("clears when the prop flips back", async () => {
      const w = checkbox({ indeterminate: true });
      await w.setProps({ indeterminate: false });
      expect((input(w).element as HTMLInputElement).indeterminate).toBe(false);
    });
  });

  describe("label", () => {
    it("is absent without text or slot", () => {
      expect(checkbox().find("label").exists()).toBe(false);
    });

    it("points `for` at the input", () => {
      const w = checkbox({ label: "Subscribe" });
      expect(w.find("label").attributes("for")).toBe(input(w).attributes("id"));
    });

    it("drops the association when disabled, so a click cannot toggle it", () => {
      const w = checkbox({ label: "Subscribe", disabled: true });
      expect(w.find("label").attributes("for")).toBeUndefined();
      expect(w.find("label").classes()).toContain("v-checkbox__label--disabled");
    });

    it("can be slotted", () => {
      const w = checkbox({}, { label: "<b class='custom'>Terms</b>" });
      expect(w.find(".custom").exists()).toBe(true);
    });
  });

  describe("id", () => {
    it("comes from useId when not supplied", () => {
      expect(input(checkbox({ label: "x" })).attributes("id")).toBeTruthy();
    });

    it("an explicit id wins", () => {
      expect(input(checkbox({ id: "terms", label: "x" })).attributes("id")).toBe("terms");
    });

    it("two checkboxes in one app get different ids", () => {
      const Host = defineComponent({
        components: { VCheckbox },
        template: "<div><VCheckbox label='a' /><VCheckbox label='b' /></div>",
      });
      const w = mount(Host);
      const [first, second] = w.findAll("input").map(i => i.attributes("id"));
      expect(first).not.toBe(second);
    });
  });

  it("disables the input", () => {
    expect(input(checkbox({ disabled: true })).attributes("disabled")).toBeDefined();
  });

  it("forwards stray attributes onto the input, not the wrapper", () => {
    const w = mount(VCheckbox, { props: { label: "x" }, attrs: { "aria-describedby": "hint" } });
    expect(w.find("input").attributes("aria-describedby")).toBe("hint");
    expect(w.attributes("aria-describedby")).toBeUndefined();
  });
});
