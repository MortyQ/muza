import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VLoader from "../../../../src/components/feedback/VLoader.vue";
import VProgressBar from "../../../../src/components/feedback/VProgressBar.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { computed as computedValue, rawToken, tokenAsColor } from "../../../setup/tokens";

const LOADER_TONES = {
  primary: "--ui-primary",
  secondary: "--ui-foreground-secondary",
  success: "--ui-success",
  warning: "--ui-warning",
  danger: "--ui-danger",
  info: "--ui-info",
} as const;

describe.each(THEME_CASES)("feedback tokens — %s theme", (theme) => {
  async function mountIt(component: unknown, props: Record<string, unknown>): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(component as never, { props });
    return screen.container.firstElementChild as HTMLElement;
  }

  describe("VLoader", () => {
    it.each(Object.entries(LOADER_TONES))("variant %s takes its colour from %s", async (variant, token) => {
      const el = await mountIt(VLoader, { variant });
      const spinner = el.querySelector(".v-loader") as HTMLElement;
      expect(getComputedStyle(spinner).color).toBe(tokenAsColor(token));
    });

    it("defaults to the primary tone", async () => {
      const el = await mountIt(VLoader, {});
      const spinner = el.querySelector(".v-loader") as HTMLElement;
      expect(getComputedStyle(spinner).color).toBe(tokenAsColor("--ui-primary"));
    });

    it("every size resolves to a different box", async () => {
      const sizes = new Set<string>();
      for (const size of ["sm", "md", "lg"] as const) {
        const el = await mountIt(VLoader, { size });
        sizes.add(getComputedStyle(el.querySelector(".v-loader") as HTMLElement).width);
      }
      expect(sizes.size).toBe(3);
    });

    it("fullscreen scrims with a translucent mix of the background token", async () => {
      const el = await mountIt(VLoader, { fullscreen: true });
      const background = getComputedStyle(el).backgroundColor;

      // Not blanked out...
      expect(background).not.toBe("rgba(0, 0, 0, 0)");
      // ...and not the opaque token either: the point of the scrim is that the
      // page stays visible underneath. The exact serialisation of a color-mix
      // varies by engine, so compare against the token rather than parse it.
      expect(background).not.toBe(tokenAsColor("--ui-background"));
    });

    it("fullscreen covers the viewport", async () => {
      const el = await mountIt(VLoader, { fullscreen: true });
      expect(getComputedStyle(el).position).toBe("fixed");
    });
  });

  describe("VProgressBar", () => {
    it("carries the percentage into CSS unchanged", async () => {
      const el = await mountIt(VProgressBar, { percentage: 42 });
      expect(computedValue(el, "--v-progress-value")).toBe("42%");
    });

    it("sizes the fill from that variable", async () => {
      const el = await mountIt(VProgressBar, { percentage: 50 });
      const track = el.querySelector(".v-progress-bar__track") as HTMLElement;
      const fill = el.querySelector(".v-progress-bar__fill") as HTMLElement;
      const trackWidth = parseFloat(getComputedStyle(track).width);
      const fillWidth = parseFloat(getComputedStyle(fill).width);
      expect(fillWidth).toBeCloseTo(trackWidth / 2, 0);
    });

    it("clamps an out-of-range percentage before it reaches CSS", async () => {
      const over = await mountIt(VProgressBar, { percentage: 250 });
      const under = await mountIt(VProgressBar, { percentage: -50 });
      expect(computedValue(over, "--v-progress-value")).toBe("100%");
      expect(computedValue(under, "--v-progress-value")).toBe("0%");
    });

    it("runs on the primary accent while in progress", async () => {
      const el = await mountIt(VProgressBar, { percentage: 40 });
      expect(computedValue(el, "--v-progress-accent")).toBe(rawToken("--ui-primary"));
      expect(computedValue(el, "--v-progress-accent-soft")).toBe(rawToken("--ui-primary-hover"));
    });

    it("switches the whole accent pair to success on completion", async () => {
      const el = await mountIt(VProgressBar, { percentage: 100 });
      expect(computedValue(el, "--v-progress-accent")).toBe(rawToken("--ui-success"));
      expect(computedValue(el, "--v-progress-accent-soft")).toBe(rawToken("--ui-success-hover"));
    });

    it("tones the percentage label with the same accent", async () => {
      const running = await mountIt(VProgressBar, { percentage: 40 });
      const done = await mountIt(VProgressBar, { percentage: 100 });
      const label = (el: HTMLElement) =>
        getComputedStyle(el.querySelector(".v-progress-bar__percentage") as HTMLElement).color;
      expect(label(running)).toBe(tokenAsColor("--ui-primary"));
      expect(label(done)).toBe(tokenAsColor("--ui-success"));
    });

    it.each([
      ["sm", "4px"],
      ["md", "6px"],
      ["lg", "8px"],
    ] as const)("size %s gives a %s track", async (size, expected) => {
      const el = await mountIt(VProgressBar, { percentage: 50, size });
      expect(computedValue(el, "--v-progress-track-height")).toBe(expected);
      const track = el.querySelector(".v-progress-bar__track") as HTMLElement;
      expect(getComputedStyle(track).height).toBe(expected);
    });
  });
});
