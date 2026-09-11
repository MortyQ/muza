import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VMeter from "../../../../src/components/feedback/VMeter.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { tokenAsColor, tokenAsValue } from "../../../setup/tokens";

describe.each(THEME_CASES)("VMeter tokens — %s theme", (theme) => {
  async function renderMeter(props: Record<string, unknown>): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VMeter, { props });
    return screen.container.firstElementChild as HTMLElement;
  }

  const fill = (root: HTMLElement) => root.querySelector<HTMLElement>(".v-meter__fill");
  const track = (root: HTMLElement) => root.querySelector<HTMLElement>(".v-meter__track");

  it("paints a met bar with the success token", async () => {
    const root = await renderMeter({ value: 100, max: 100 });
    expect(getComputedStyle(fill(root)!).backgroundColor).toBe(tokenAsColor("--ui-success"));
  });

  it("paints an unmet bar with the warning token", async () => {
    const root = await renderMeter({ value: 10, max: 100 });
    expect(getComputedStyle(fill(root)!).backgroundColor).toBe(tokenAsColor("--ui-warning"));
    // Not danger: a measurement below a floor is a state to act on, not a
    // failure — the component draws no red at all.
    expect(getComputedStyle(fill(root)!).backgroundColor).not.toBe(tokenAsColor("--ui-danger"));
  });

  it("keeps the track translucent so it reads on any surface", async () => {
    const root = await renderMeter({ value: 50, max: 100 });
    const bg = getComputedStyle(track(root)!).backgroundColor;
    expect(bg).not.toBe(tokenAsColor("--ui-border"));
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
  });

  it("rounds the track fully, from the radius scale", async () => {
    const root = await renderMeter({ value: 50, max: 100 });
    expect(getComputedStyle(track(root)!).borderRadius)
      .toBe(tokenAsValue("border-radius", "--ui-radius-full"));
  });

  it.each([["sm", "4px"], ["md", "6px"]] as const)("%s track is %s tall", async (size, height) => {
    const root = await renderMeter({ value: 1, max: 2, size });
    expect(getComputedStyle(track(root)!).height).toBe(height);
  });

  it("scales the fill rather than resizing it", async () => {
    // A transform stays off the layout path; a width animation does not.
    const root = await renderMeter({ value: 25, max: 100 });
    const matrix = getComputedStyle(fill(root)!).transform;
    expect(matrix).toBe("matrix(0.25, 0, 0, 1, 0, 0)");
  });

  it("grows the fill from the left edge", async () => {
    const root = await renderMeter({ value: 50, max: 100 });
    expect(getComputedStyle(fill(root)!).transformOrigin).toMatch(/^0px /);
  });

  it("tints the state icon to match the bar", async () => {
    const met = await renderMeter({ value: 100, max: 100 });
    expect(getComputedStyle(met.querySelector(".v-meter__icon--met")!).color)
      .toBe(tokenAsColor("--ui-success"));

    const unmet = await renderMeter({ value: 1, max: 100 });
    expect(getComputedStyle(unmet.querySelector(".v-meter__icon--unmet")!).color)
      .toBe(tokenAsColor("--ui-warning"));
  });

  it("sets the label one step back in the text hierarchy", async () => {
    const root = await renderMeter({ value: 1, max: 2 });
    const label = root.querySelector<HTMLElement>(".v-meter__value")!;
    expect(getComputedStyle(label).color).toBe(tokenAsColor("--ui-foreground-secondary"));
    expect(getComputedStyle(label).color).not.toBe(tokenAsColor("--ui-foreground"));
  });

  it("gives the numbers tabular figures so a column of meters aligns", async () => {
    const root = await renderMeter({ value: 1, max: 2 });
    expect(getComputedStyle(root.querySelector(".v-meter__value")!).fontVariantNumeric)
      .toContain("tabular-nums");
  });

  it("signals the wait through the cursor, not a colour change", async () => {
    const root = await renderMeter({ value: null, max: 100, pending: true });
    const label = root.querySelector<HTMLElement>(".v-meter__value")!;
    expect(getComputedStyle(label).cursor).toBe("progress");
    expect(getComputedStyle(label).opacity).toBe("0.7");
  });

  it("takes the help cursor only with a hint", async () => {
    const withHint = await renderMeter({ value: 1, max: 2, hint: "why this matters" });
    expect(getComputedStyle(withHint.querySelector(".v-meter__value")!).cursor).toBe("help");

    const without = await renderMeter({ value: 1, max: 2 });
    expect(getComputedStyle(without.querySelector(".v-meter__value")!).cursor).not.toBe("help");
  });

  it("holds the row's height while pending, so an arriving value does not shove it", async () => {
    const pending = await renderMeter({ value: null, max: 100, pending: true });
    const pendingHeight = pending.getBoundingClientRect().height;

    const settled = await renderMeter({ value: 40, max: 100 });
    expect(settled.getBoundingClientRect().height).toBe(pendingHeight);
  });

  it("drops the track entirely when there is nothing to measure", async () => {
    const root = await renderMeter({ value: null, max: 100 });
    expect(track(root)).toBeNull();
  });
});
