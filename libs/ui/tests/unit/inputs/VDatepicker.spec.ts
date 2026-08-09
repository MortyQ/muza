import { mount } from "@vue/test-utils";
import { VueDatePicker } from "@vuepic/vue-datepicker";
import { describe, expect, it } from "vitest";

import VDatepicker from "../../../src/components/inputs/VDatepicker.vue";

const stubs = { Icon: true, VueDatePicker: true };

/**
 * VDatepicker wraps @vuepic/vue-datepicker. Its own contract is the chrome it
 * adds — label, helper text, error state, sizing, width — plus the handful of
 * library props it pins and the icon slots it fills in. The calendar itself is
 * the library's to test.
 */
function picker(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(VDatepicker, { props, slots, global: { stubs } });
}

const inner = (w: ReturnType<typeof picker>) => w.findComponent(VueDatePicker);

describe("VDatepicker", () => {
  describe("pinned library props", () => {
    it("forces UTC, so a date never shifts with the viewer's timezone", () => {
      expect(inner(picker()).props().timezone).toBe("UTC");
    });

    it("starts the week on Sunday", () => {
      expect(inner(picker()).props().weekStart).toBe(0);
    });

    it("auto-applies by default", () => {
      expect(inner(picker()).props().autoApply).toBe(true);
      expect(inner(picker({ autoApply: false })).props().autoApply).toBe(false);
    });

    it("names its calendar and menu classes so the SCSS can reach them", () => {
      // Not declared props on the library component, so they arrive as attrs.
      const attrs = inner(picker()).attributes();
      expect(attrs["calendar-class-name"]).toBe("v-datepicker-calendar");
      expect(attrs["menu-class-name"]).toBe("v-datepicker-menu");
    });
  });

  describe("model", () => {
    it("passes the value down", () => {
      const value = new Date("2026-01-15T00:00:00Z");
      expect(inner(picker({ modelValue: value })).props().modelValue).toEqual(value);
    });

    it("re-emits an update", async () => {
      const w = picker();
      const value = new Date("2026-02-01T00:00:00Z");
      inner(w).vm.$emit("update:modelValue", value);
      await w.vm.$nextTick();
      expect(w.emitted("update:modelValue")?.[0]).toEqual([value]);
    });
  });

  describe("label and helper text", () => {
    it("renders no label without a name", () => {
      expect(picker().find(".v-datepicker-label").exists()).toBe(false);
    });

    it("renders the label", () => {
      expect(picker({ name: "Delivery date" }).find(".v-datepicker-label").text())
        .toBe("Delivery date");
    });

    it("renders helper text while there is no error", () => {
      expect(picker({ helperText: "Ships the next day" }).find(".v-datepicker-helper-text").text())
        .toBe("Ships the next day");
    });

    it("hides the helper text once the field is invalid", () => {
      const w = picker({
        helperText: "Ships the next day",
        validation: { $error: true, $errors: [{ $message: "Required" }] },
      });
      expect(w.find(".v-datepicker-helper-text").exists()).toBe(false);
    });
  });

  describe("validation", () => {
    it("shows the first message", () => {
      const w = picker({ validation: { $error: true, $errors: [{ $message: "Required" }] } });
      expect(w.find(".form-error").text()).toBe("Required");
    });

    it("marks the picker and its input", () => {
      const w = picker({ validation: { $error: true, $errors: [{ $message: "Required" }] } });
      const classes = inner(w).classes();
      expect(classes).toContain("v-datepicker-error");
    });

    it("stays clean while valid", () => {
      const w = picker({ validation: { $error: false, $errors: [] } });
      expect(w.find(".form-error").exists()).toBe(false);
      expect(inner(w).classes()).not.toContain("v-datepicker-error");
    });
  });

  describe("clearable", () => {
    it("is off by default, and says so through a class", () => {
      expect(inner(picker()).classes()).toContain("v-datepicker-no-clear");
    });

    it("drops that class when enabled", () => {
      expect(inner(picker({ clearable: true })).classes()).not.toContain("v-datepicker-no-clear");
    });
  });

  describe("size and width", () => {
    it.each(["sm", "md", "lg"] as const)("applies the %s size class", (size) => {
      expect(picker({ size }).classes()).toContain(`v-datepicker--${size}`);
    });

    it("defaults to md", () => {
      expect(picker().classes()).toContain("v-datepicker--md");
    });

    it("hands an explicit width to CSS as a variable", () => {
      const w = picker({ width: "240px" });
      expect(w.attributes("style")).toContain("--v-datepicker-width: 240px");
      expect(w.attributes("style")).not.toMatch(/(^|;)\s*width:/);
    });
  });

  it("does not spread stray attributes onto the wrapper", () => {
    const w = mount(VDatepicker, {
      attrs: { "data-testid": "delivery" },
      global: { stubs },
    });
    expect(w.attributes("data-testid")).toBeUndefined();
  });
});
