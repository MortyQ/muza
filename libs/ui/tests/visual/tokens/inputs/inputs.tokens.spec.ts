import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VCheckbox from "../../../../src/components/inputs/VCheckbox.vue";
import VInput from "../../../../src/components/inputs/VInput.vue";
import VSegmentedControl from "../../../../src/components/inputs/VSegmentedControl.vue";
import VSwitch from "../../../../src/components/inputs/VSwitch.vue";
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
    it("fills the track's height with each segment, through the tooltip wrapper", async () => {
      // Every segment sits inside a VTooltip div. If that wrapper did not
      // stretch, the track would still measure 30px — so the row spec would
      // pass — while the segments inside it came up short.
      const el = await mountIt(VSegmentedControl, {
        options: [{ label: "Day", value: "day", tooltip: "Group by day" }, ...SEGMENTS.slice(1)],
        modelValue: "day",
      });
      const track = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const inner = track.height
        - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
        - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth);

      for (const item of el.querySelectorAll<HTMLElement>(".v-sc__item")) {
        expect(Math.round(item.getBoundingClientRect().height)).toBe(Math.round(inner));
      }
    });

    describe("the sliding pill", () => {
      // Segments are transparent when active; the pill is the active surface.
      // So the geometry that matters is the pill's against the chosen segment,
      // measured in the same coordinate space.
      const THREE = [...SEGMENTS, { label: "Month", value: "month" }];
      const frame = () => new Promise(r => requestAnimationFrame(() => r(null)));

      async function mountPill(modelValue: string | null = "day") {
        await applyTheme(theme);
        const screen = render(VSegmentedControl as never, {
          props: { options: THREE, modelValue },
        });
        await frame();
        const el = screen.container.firstElementChild as HTMLElement;
        return { screen, el, pill: el.querySelector<HTMLElement>(".v-sc__pill")! };
      }

      const box = (el: HTMLElement) => el.getBoundingClientRect();
      const segment = (el: HTMLElement, i: number) =>
        el.querySelectorAll<HTMLElement>(".v-sc__item")[i];

      it("sits exactly over the selected segment", async () => {
        const { el, pill } = await mountPill("week");
        const target = segment(el, 1);
        expect(Math.round(box(pill).left)).toBe(Math.round(box(target).left));
        expect(Math.round(box(pill).width)).toBe(Math.round(box(target).width));
      });

      it("moves to a new selection, and takes the new segment's width", async () => {
        const { screen, el, pill } = await mountPill("day");
        await screen.rerender({ options: THREE, modelValue: "month" });
        await frame();
        const target = segment(el, 2);
        expect(Math.round(box(pill).left)).toBe(Math.round(box(target).left));
        expect(Math.round(box(pill).width)).toBe(Math.round(box(target).width));
      });

      it("is the active surface, drawn from the surface token", async () => {
        const { el, pill } = await mountPill("day");
        expect(getComputedStyle(pill).backgroundColor).toBe(tokenAsColor("--ui-surface"));
        // Which is why the segment itself must not paint one: it would cut to
        // it instantly and the slide would be invisible underneath.
        expect(getComputedStyle(segment(el, 0)).backgroundColor).toBe("rgba(0, 0, 0, 0)");
      });

      it("hides when nothing is selected, rather than being left behind", async () => {
        const { pill } = await mountPill(null);
        expect(pill.classList.contains("v-sc__pill--visible")).toBe(false);
        expect(getComputedStyle(pill).opacity).toBe("0");
      });

      it("arms its transition only after it has been placed once", async () => {
        // Without this the first placement animates too, and the pill slides in
        // from the track's left edge on every page load. The duration itself is
        // not asserted — the browser setup zeroes every transition (trap 10).
        await applyTheme(theme);
        const screen = render(VSegmentedControl as never, {
          props: { options: THREE, modelValue: "month" },
        });
        const pill = screen.container.querySelector<HTMLElement>(".v-sc__pill")!;
        expect(pill.classList.contains("v-sc__pill--ready")).toBe(false);
        await frame();
        await frame();
        expect(pill.classList.contains("v-sc__pill--ready")).toBe(true);
      });

      it("sits above nothing it should not — segments stay clickable over it", async () => {
        const { el, pill } = await mountPill("day");
        expect(getComputedStyle(pill).pointerEvents).toBe("none");
        expect(Number(getComputedStyle(segment(el, 0)).zIndex))
          .toBeGreaterThan(Number(getComputedStyle(pill).zIndex) || 0);
      });
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
});
