import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import VIcon from "../../../src/components/base/VIcon.vue";
import VSwitch from "../../../src/components/inputs/VSwitch.vue";

const stubs = { Icon: true };

function sw(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(VSwitch, { props, slots, global: { stubs } });
}

const input = (w: ReturnType<typeof sw>) => w.find("input");
const track = (w: ReturnType<typeof sw>) => w.find(".v-switch__track");

describe("VSwitch", () => {
  it("defaults to off", () => {
    expect((input(sw()).element as HTMLInputElement).checked).toBe(false);
  });

  it("reflects the model on the input and the track", () => {
    const w = sw({ modelValue: true });
    expect((input(w).element as HTMLInputElement).checked).toBe(true);
    expect(track(w).classes()).toContain("v-switch__track--checked");
    expect(w.find(".v-switch__thumb").classes()).toContain("v-switch__thumb--checked");
  });

  it("emits on change", async () => {
    const w = sw({ modelValue: false });
    await input(w).setValue(true);
    expect(w.emitted("update:modelValue")?.[0]).toEqual([true]);
  });

  it("emits false when switched off", async () => {
    const w = sw({ modelValue: true });
    await input(w).setValue(false);
    expect(w.emitted("update:modelValue")?.[0]).toEqual([false]);
  });

  describe("disabled", () => {
    it("disables the input and marks both label and track", () => {
      const w = sw({ disabled: true });
      expect(input(w).attributes("disabled")).toBeDefined();
      expect(w.classes()).toContain("v-switch--disabled");
      expect(track(w).classes()).toContain("v-switch__track--disabled");
    });
  });

  describe("custom colour", () => {
    it("is applied only while checked and enabled", () => {
      const on = sw({ modelValue: true, color: "#16a34a" });
      expect(on.attributes("style") ?? track(on).attributes("style"))
        .toBeDefined();
      expect(track(on).attributes("style")).toContain("--v-switch-color: #16a34a");
      expect(track(on).classes()).toContain("v-switch__track--custom-color");
    });

    it("is dropped when off", () => {
      const off = sw({ modelValue: false, color: "#16a34a" });
      expect(track(off).attributes("style")).toBeUndefined();
      expect(track(off).classes()).not.toContain("v-switch__track--custom-color");
    });

    it("is dropped when disabled, so the disabled look wins", () => {
      const w = sw({ modelValue: true, color: "#16a34a", disabled: true });
      expect(track(w).attributes("style")).toBeUndefined();
    });

    it("reaches CSS as a variable, never as background-color", () => {
      const w = sw({ modelValue: true, color: "#16a34a" });
      expect(track(w).attributes("style")).not.toContain("background");
    });
  });

  describe("labels", () => {
    it("shows the matching label for the current state", () => {
      const off = sw({ modelValue: false, trueLabel: "On", falseLabel: "Off" });
      expect(off.find(".v-switch__label").text()).toBe("Off");

      const on = sw({ modelValue: true, trueLabel: "On", falseLabel: "Off" });
      expect(on.find(".v-switch__label").text()).toBe("On");
    });

    it("lets the default slot take over", () => {
      const w = sw({ modelValue: true, trueLabel: "On" }, { default: "Custom" });
      expect(w.find(".v-switch__label").text()).toBe("Custom");
    });
  });

  describe("icons", () => {
    it("shows the true icon only when on", () => {
      const on = sw({ modelValue: true, trueIcon: "lucide:check", falseIcon: "lucide:x" });
      expect(on.findComponent(VIcon).props().icon).toBe("lucide:check");

      const off = sw({ modelValue: false, trueIcon: "lucide:check", falseIcon: "lucide:x" });
      expect(off.findComponent(VIcon).props().icon).toBe("lucide:x");
    });

    it("renders none when neither icon is given", () => {
      expect(sw({ modelValue: true }).findAllComponents(VIcon)).toHaveLength(0);
    });

    it("renders only the icon for the current state", () => {
      const w = sw({ modelValue: true, trueIcon: "lucide:check" });
      expect(w.findAllComponents(VIcon)).toHaveLength(1);
    });
  });

  it("labels the whole control so a click anywhere toggles it", () => {
    const w = sw();
    expect(w.element.tagName).toBe("LABEL");
    expect(w.attributes("for")).toBe(input(w).attributes("id"));
  });

  it("honours an explicit id", () => {
    expect(input(sw({ id: "notify" })).attributes("id")).toBe("notify");
  });
});
