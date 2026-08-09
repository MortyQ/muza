import { nextTick } from "vue";

import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";

import VInput from "../../../src/components/inputs/VInput.vue";

const stubs = { Icon: true };

function input(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(VInput, { props, slots, global: { stubs } });
}

const field = (w: ReturnType<typeof input>) => w.find(".v-input-field");

describe("VInput", () => {
  describe("field", () => {
    it("renders an input by default", () => {
      expect(field(input()).element.tagName).toBe("INPUT");
    });

    it("renders a textarea when asked, with the requested rows", () => {
      const w = input({ textarea: true, rows: 6 });
      expect(field(w).element.tagName).toBe("TEXTAREA");
      expect(field(w).attributes("rows")).toBe("6");
      expect(field(w).classes()).toContain("v-input-field--textarea");
    });

    it("gives a textarea no type attribute", () => {
      expect(field(input({ textarea: true })).attributes("type")).toBeUndefined();
    });

    it.each(["text", "email", "number", "search", "tel", "url", "date"] as const)(
      "passes type %s through",
      (type) => {
        expect(field(input({ type })).attributes("type")).toBe(type);
      },
    );

    it.each([
      ["sm", "v-input-field--sm"],
      ["md", "v-input-field--md"],
      ["lg", "v-input-field--lg"],
    ] as const)("size %s", (size, expected) => {
      expect(field(input({ size })).classes()).toContain(expected);
    });

    it("disables the field and marks it", () => {
      const w = input({ disabled: true });
      expect(field(w).attributes("disabled")).toBeDefined();
      expect(field(w).classes()).toContain("v-input-field--disabled");
    });
  });

  describe("model", () => {
    it("shows the incoming value", () => {
      expect((field(input({ modelValue: "hello" })).element as HTMLInputElement).value).toBe("hello");
    });

    it("emits what was typed", async () => {
      const w = input({ modelValue: "" });
      await field(w).setValue("world");
      expect(w.emitted("update:modelValue")?.[0]).toEqual(["world"]);
    });

    it("coerces a numeric field to a number", async () => {
      const w = input({ type: "number", modelValue: undefined });
      await field(w).setValue("42");
      expect(w.emitted("update:modelValue")?.[0]).toEqual([42]);
    });

    it("leaves an empty numeric field as a string, not NaN", async () => {
      const w = input({ type: "number", modelValue: 1 });
      await field(w).setValue("");
      expect(w.emitted("update:modelValue")?.[0]).toEqual([""]);
    });

    it("leaves unparseable numeric input alone rather than emitting NaN", async () => {
      const w = input({ type: "number", modelValue: undefined });
      await field(w).setValue("12abc");
      const emitted = w.emitted("update:modelValue")?.[0]?.[0];
      expect(Number.isNaN(emitted)).toBe(false);
    });

    it("follows an external model change", async () => {
      const w = input({ modelValue: "a" });
      await w.setProps({ modelValue: "b" });
      expect((field(w).element as HTMLInputElement).value).toBe("b");
    });
  });

  describe("debounce", () => {
    it("emits immediately when off", async () => {
      const w = input({ modelValue: "" });
      await field(w).setValue("x");
      expect(w.emitted("update:modelValue")).toHaveLength(1);
    });

    it("waits before emitting when on", async () => {
      vi.useFakeTimers();
      try {
        const w = input({ modelValue: "", debounce: 300 });
        await field(w).setValue("x");
        expect(w.emitted("update:modelValue")).toBeUndefined();

        vi.advanceTimersByTime(300);
        await nextTick();
        expect(w.emitted("update:modelValue")?.[0]).toEqual(["x"]);
      }
      finally {
        vi.useRealTimers();
      }
    });

    it("collapses a burst of keystrokes into one emit", async () => {
      vi.useFakeTimers();
      try {
        const w = input({ modelValue: "", debounce: 200 });
        for (const value of ["a", "ab", "abc"]) {
          await field(w).setValue(value);
          vi.advanceTimersByTime(50);
        }
        expect(w.emitted("update:modelValue")).toBeUndefined();

        vi.advanceTimersByTime(200);
        await nextTick();
        expect(w.emitted("update:modelValue")).toHaveLength(1);
        expect(w.emitted("update:modelValue")?.[0]).toEqual(["abc"]);
      }
      finally {
        vi.useRealTimers();
      }
    });

    it("`debounce: true` means 800ms", async () => {
      vi.useFakeTimers();
      try {
        const w = input({ modelValue: "", debounce: true });
        await field(w).setValue("x");

        vi.advanceTimersByTime(799);
        await nextTick();
        expect(w.emitted("update:modelValue")).toBeUndefined();

        vi.advanceTimersByTime(1);
        await nextTick();
        expect(w.emitted("update:modelValue")).toHaveLength(1);
      }
      finally {
        vi.useRealTimers();
      }
    });

    it("keeps the visible value in step while the emit is still pending", async () => {
      vi.useFakeTimers();
      try {
        const w = input({ modelValue: "", debounce: 300 });
        await field(w).setValue("typing");
        expect((field(w).element as HTMLInputElement).value).toBe("typing");
      }
      finally {
        vi.useRealTimers();
      }
    });
  });

  describe("clear button", () => {
    it("appears once there is a value", async () => {
      const w = input({ modelValue: "" });
      expect(w.find(".v-input-clear-btn").exists()).toBe(false);

      await field(w).setValue("x");
      expect(w.find(".v-input-clear-btn").exists()).toBe(true);
    });

    it("clears the model and emits clear", async () => {
      const w = input({ modelValue: "x" });
      await w.find(".v-input-clear-btn").trigger("click");
      expect(w.emitted("update:modelValue")?.[0]).toEqual([""]);
      expect(w.emitted("clear")).toHaveLength(1);
    });

    it("clears a numeric field to undefined, not an empty string", async () => {
      const w = input({ type: "number", modelValue: 5 });
      await w.find(".v-input-clear-btn").trigger("click");
      expect(w.emitted("update:modelValue")?.[0]).toEqual([undefined]);
    });

    it("never appears on a password field", async () => {
      const w = input({ type: "password", modelValue: "secret" });
      expect(w.find(".v-input-clear-btn").exists()).toBe(false);
    });

    it("can be switched off", async () => {
      const w = input({ modelValue: "x", showClearButton: false });
      expect(w.find(".v-input-clear-btn").exists()).toBe(false);
    });

    it("is labelled for screen readers", () => {
      expect(input({ modelValue: "x" }).find(".v-input-clear-btn").attributes("aria-label"))
        .toBe("Clear input");
    });
  });

  describe("password", () => {
    it("starts masked", () => {
      expect(field(input({ type: "password" })).attributes("type")).toBe("password");
    });

    it("reveals and re-masks on toggle", async () => {
      const w = input({ type: "password" });
      await w.find(".v-input-password-toggle").trigger("click");
      expect(field(w).attributes("type")).toBe("text");

      await w.find(".v-input-password-toggle").trigger("click");
      expect(field(w).attributes("type")).toBe("password");
    });

    it("is reachable from the keyboard", async () => {
      const w = input({ type: "password" });
      const toggle = w.find(".v-input-password-toggle");
      expect(toggle.attributes("tabindex")).toBe("0");
      expect(toggle.attributes("role")).toBe("button");

      await toggle.trigger("keydown.enter");
      expect(field(w).attributes("type")).toBe("text");
    });
  });

  describe("errors", () => {
    it("shows an error string", () => {
      const w = input({ error: "Required" });
      expect(w.find(".v-input-error-message").text()).toBe("Required");
    });

    it("reads the first message off a validation object", () => {
      const w = input({ validation: { $error: true, $errors: [{ $message: "Too short" }] } });
      expect(w.find(".v-input-error-message").text()).toBe("Too short");
    });

    it("stays quiet while the validation object reports no error", () => {
      const w = input({ validation: { $error: false, $errors: [] } });
      expect(w.find(".v-input-error-message").exists()).toBe(false);
    });

    it("marks the field invalid and points aria-describedby at the message", () => {
      const w = input({ error: "Required" });
      expect(field(w).attributes("aria-invalid")).toBe("true");
      expect(field(w).attributes("aria-describedby")).toBe(`${field(w).attributes("id")}-error`);
    });

    it("hides the helper text once an error is showing", () => {
      const w = input({ helperText: "Two or more characters", error: "Required" });
      expect(w.find(".v-input-helper-text").exists()).toBe(false);
    });

    it("tones the leading icon through a modifier, not a utility class", () => {
      const w = input({ icon: "lucide:mail", error: "Required" });
      expect(w.find(".v-input-icon-svg").classes()).toContain("v-input-icon-svg--error");
    });
  });

  describe("helper text", () => {
    it("renders when there is no error", () => {
      const w = input({ helperText: "Two or more characters" });
      expect(w.find(".v-input-helper-text").text()).toBe("Two or more characters");
      expect(field(w).attributes("aria-describedby")).toBe(`${field(w).attributes("id")}-helper`);
    });

    it("leaves aria-describedby off when there is neither", () => {
      expect(field(input()).attributes("aria-describedby")).toBeUndefined();
    });
  });

  describe("label", () => {
    it("renders only with a name", () => {
      expect(input().find(".v-label").exists()).toBe(false);
      expect(input({ name: "Email" }).find(".v-label").text()).toBe("Email");
    });

    it("points `for` at the field", () => {
      const w = input({ name: "Email" });
      expect(w.find(".v-label").attributes("for")).toBe(field(w).attributes("id"));
    });

    it("floats once there is a value", () => {
      expect(input({ name: "Email", modelValue: "a@b.c" }).find(".v-label").classes())
        .toContain("v-label--active");
    });

    it("floats on focus", async () => {
      const w = input({ name: "Email" });
      await field(w).trigger("focus");
      expect(w.find(".v-label").classes()).toContain("v-label--active");
    });

    it("holds the placeholder back until focus, so it does not clash with the label", async () => {
      const w = input({ name: "Email", placeholder: "you@example.com" });
      expect(field(w).attributes("placeholder")).toBe("");

      await field(w).trigger("focus");
      expect(field(w).attributes("placeholder")).toBe("you@example.com");
    });

    it("shows the placeholder immediately when there is no label to clash with", () => {
      const w = input({ placeholder: "Search" });
      expect(field(w).attributes("placeholder")).toBe("Search");
    });
  });

  describe("icons", () => {
    it("shows a search glyph for a search field", () => {
      expect(input({ type: "search" }).find(".v-input-icon-left").exists()).toBe(true);
    });

    it("shows the explicit icon", () => {
      expect(input({ icon: "lucide:mail" }).find(".v-input-icon-left").exists()).toBe(true);
    });

    it("shows a spinner while loading", () => {
      expect(input({ loading: true }).find(".v-input-icon-left").exists()).toBe(true);
    });

    it("renders no leading slot without a reason to", () => {
      expect(input().find(".v-input-icon-left").exists()).toBe(false);
    });

    it("lets slots replace either side", () => {
      const w = input({ modelValue: "x" }, {
        "icon-left": "<b class='left' />",
        "icon-right": "<b class='right' />",
      });
      expect(w.find(".left").exists()).toBe(true);
      expect(w.find(".right").exists()).toBe(true);
      expect(w.find(".v-input-clear-btn").exists()).toBe(false);
    });
  });

  it("forwards stray attributes to the field, not the wrapper", () => {
    const w = mount(VInput, {
      attrs: { maxlength: "10", "data-testid": "email" },
      global: { stubs },
    });
    expect(w.find(".v-input-field").attributes("maxlength")).toBe("10");
    expect(w.attributes("data-testid")).toBeUndefined();
  });
});
