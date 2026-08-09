import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VCheckbox from "../../../../src/components/inputs/VCheckbox.vue";
import VInput from "../../../../src/components/inputs/VInput.vue";
import VSegmentedControl from "../../../../src/components/inputs/VSegmentedControl.vue";
import VSwitch from "../../../../src/components/inputs/VSwitch.vue";
import VToggleGroup from "../../../../src/components/inputs/VToggleGroup.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { computed as computedValue, tokenAsColor } from "../../../setup/tokens";

const SEGMENTS = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
];

describe.each(THEME_CASES)("input tokens — %s theme", (theme) => {
  async function mountIt(
    component: unknown,
    props: Record<string, unknown> = {},
  ): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(component as never, { props });
    return screen.container.firstElementChild as HTMLElement;
  }

  describe("VInput", () => {
    it("sits on the input surface tokens rather than the generic surface", async () => {
      // VInput, VSelect and VDatepicker have to agree here — they sit side by
      // side in a form and a mismatch is immediately visible.
      const el = await mountIt(VInput, {});
      // The surface is on the container; the field itself is transparent so the
      // fieldset border can show through it.
      const container = el.querySelector(".v-input-container") as HTMLElement;
      const field = el.querySelector(".v-input-field") as HTMLElement;
      expect(getComputedStyle(container).backgroundColor).toBe(tokenAsColor("--ui-input-bg"));
      expect(getComputedStyle(field).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    });

    it("draws its border from the input border token", async () => {
      const el = await mountIt(VInput, {});
      const fieldset = el.querySelector(".v-fieldset") as HTMLElement;
      expect(getComputedStyle(fieldset).borderTopColor).toBe(tokenAsColor("--ui-input-border"));
    });

    it("turns the border danger-coloured when invalid", async () => {
      const el = await mountIt(VInput, { error: "Required" });
      const fieldset = el.querySelector(".v-fieldset") as HTMLElement;
      expect(getComputedStyle(fieldset).borderTopColor).toBe(tokenAsColor("--ui-danger"));
    });

    it("tones the leading icon with danger through its modifier", async () => {
      const el = await mountIt(VInput, { icon: "lucide:mail", error: "Required" });
      const icon = el.querySelector(".v-input-icon-svg") as HTMLElement;
      expect(getComputedStyle(icon).color).toBe(tokenAsColor("--ui-danger"));
    });

    it("tones the error message with danger too", async () => {
      const el = await mountIt(VInput, { error: "Required" });
      const message = el.querySelector(".v-input-error-message") as HTMLElement;
      expect(getComputedStyle(message).color).toBe(tokenAsColor("--ui-danger"));
    });

    it("every size resolves to a different height", async () => {
      const heights = new Set<string>();
      for (const size of ["sm", "md", "lg"] as const) {
        const el = await mountIt(VInput, { size });
        heights.add(getComputedStyle(el.querySelector(".v-input-field") as HTMLElement).height);
      }
      expect(heights.size).toBe(3);
    });
  });

  describe("VSwitch", () => {
    it("runs on the primary token when checked", async () => {
      const el = await mountIt(VSwitch, { modelValue: true });
      const track = el.querySelector(".v-switch__track") as HTMLElement;
      expect(getComputedStyle(track).backgroundColor).toBe(tokenAsColor("--ui-primary"));
    });

    it("is visibly different when off", async () => {
      const on = await mountIt(VSwitch, { modelValue: true });
      const off = await mountIt(VSwitch, { modelValue: false });
      const bg = (el: HTMLElement) =>
        getComputedStyle(el.querySelector(".v-switch__track") as HTMLElement).backgroundColor;
      expect(bg(on)).not.toBe(bg(off));
    });

    it("lets a custom colour override the token", async () => {
      const el = await mountIt(VSwitch, { modelValue: true, color: "rgb(22, 163, 74)" });
      const track = el.querySelector(".v-switch__track") as HTMLElement;
      expect(computedValue(track, "--v-switch-color")).toBe("rgb(22, 163, 74)");
      expect(getComputedStyle(track).backgroundColor).toBe("rgb(22, 163, 74)");
    });

    it("ignores the custom colour while disabled", async () => {
      const el = await mountIt(VSwitch, { modelValue: true, color: "rgb(22, 163, 74)", disabled: true });
      const track = el.querySelector(".v-switch__track") as HTMLElement;
      expect(getComputedStyle(track).backgroundColor).not.toBe("rgb(22, 163, 74)");
    });

    it("gives the thumb a theme-aware shadow, not a black one", async () => {
      // A hardcoded black drop shadow is invisible on a dark surface — this is
      // exactly the defect the convention guard turned up.
      const el = await mountIt(VSwitch, { modelValue: false });
      const thumb = el.querySelector(".v-switch__thumb") as HTMLElement;
      expect(getComputedStyle(thumb).boxShadow).not.toBe("none");
    });
  });

  describe("VCheckbox", () => {
    it("uses the primary token once checked", async () => {
      const el = await mountIt(VCheckbox, { modelValue: true, label: "Subscribe" });
      const box = el.querySelector(".v-checkbox__input") as HTMLElement;
      expect(getComputedStyle(box).backgroundColor).toBe(tokenAsColor("--ui-primary"));
    });

    it("looks different when unchecked", async () => {
      const on = await mountIt(VCheckbox, { modelValue: true });
      const off = await mountIt(VCheckbox, { modelValue: false });
      const bg = (el: HTMLElement) =>
        getComputedStyle(el.querySelector(".v-checkbox__input") as HTMLElement).backgroundColor;
      expect(bg(on)).not.toBe(bg(off));
    });
  });

  describe("VSegmentedControl", () => {
    it("distinguishes the active segment", async () => {
      const el = await mountIt(VSegmentedControl, { options: SEGMENTS, modelValue: "day" });
      const [active, idle] = [...el.querySelectorAll(".v-sc__item")] as HTMLElement[];
      expect(getComputedStyle(active).backgroundColor)
        .not.toBe(getComputedStyle(idle).backgroundColor);
    });

    it("every size resolves to a different height", async () => {
      const heights = new Set<string>();
      for (const size of ["sm", "md", "lg"] as const) {
        const el = await mountIt(VSegmentedControl, { options: SEGMENTS, modelValue: "day", size });
        heights.add(getComputedStyle(el).height);
      }
      expect(heights.size).toBe(3);
    });

    it("stretches only when asked", async () => {
      const normal = await mountIt(VSegmentedControl, { options: SEGMENTS, modelValue: "day" });
      const full = await mountIt(VSegmentedControl, {
        options: SEGMENTS, modelValue: "day", fullWidth: true,
      });
      expect(parseFloat(getComputedStyle(full).width))
        .toBeGreaterThan(parseFloat(getComputedStyle(normal).width));
    });
  });

  describe("VToggleGroup", () => {
    it("distinguishes the active item", async () => {
      const el = await mountIt(VToggleGroup, {
        options: [{ label: "List", value: "list" }, { label: "Grid", value: "grid" }],
        modelValue: "list",
      });
      const [active, idle] = [...el.querySelectorAll(".v-tg__item")] as HTMLElement[];
      expect(getComputedStyle(active).backgroundColor)
        .not.toBe(getComputedStyle(idle).backgroundColor);
    });
  });
});
