import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VTag from "../../../../src/components/base/VTag.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { tokenAsColor, tokenAsValue } from "../../../setup/tokens";

const STATUS = ["primary", "success", "warning", "danger", "info"] as const;

/** A colour expression as the browser serialises it in a `color` position. */
function colorOf(expression: string): string {
  const probe = document.createElement("span");
  probe.style.color = expression;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

describe.each(THEME_CASES)("VTag tokens — %s theme", (theme) => {
  async function renderTag(props: Record<string, unknown>): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VTag, { props: { label: "Tag", ...props } });
    return screen.container.firstElementChild as HTMLElement;
  }

  it.each(STATUS)("solid %s fills with the tone and its foreground", async (color) => {
    const style = getComputedStyle(await renderTag({ variant: "solid", color }));
    expect(style.backgroundColor).toBe(tokenAsColor(`--ui-${color}`));
    expect(style.color).toBe(tokenAsColor(`--ui-${color}-foreground`));
  });

  // -foreground is for a solid fill only: on a subtle fill it is unreadable in
  // the dark theme, which is the bug this pins down.
  it.each(STATUS)("soft %s reads -hover on the subtle fill", async (color) => {
    const style = getComputedStyle(await renderTag({ variant: "soft", color }));
    expect(style.backgroundColor).toBe(tokenAsColor(`--ui-${color}-subtle`));
    expect(style.color).toBe(tokenAsColor(`--ui-${color}-hover`));
    expect(style.color).not.toBe(tokenAsColor(`--ui-${color}-foreground`));
  });

  it.each(STATUS)("outline %s draws a half-strength tonal border over nothing", async (color) => {
    const style = getComputedStyle(await renderTag({ variant: "outline", color }));
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(style.borderTopColor).toBe(colorOf(`color-mix(in oklch, var(--ui-${color}) 50%, transparent)`));
    expect(style.color).toBe(tokenAsColor(`--ui-${color}-hover`));
  });

  it("neutral soft sits on the badge tokens", async () => {
    const style = getComputedStyle(await renderTag({ variant: "soft", color: "neutral" }));
    expect(style.backgroundColor).toBe(tokenAsColor("--ui-badge-neutral-bg"));
    expect(style.color).toBe(tokenAsColor("--ui-badge-neutral-text"));
  });

  it.each([["error", "danger"], ["gray", "neutral"]] as const)(
    "%s renders exactly as %s",
    async (alias, tone) => {
      const a = getComputedStyle(await renderTag({ variant: "soft", color: alias }));
      const b = getComputedStyle(await renderTag({ variant: "soft", color: tone }));
      expect(a.backgroundColor).toBe(b.backgroundColor);
      expect(a.color).toBe(b.color);
    },
  );

  describe("customColor", () => {
    it("takes over from the colour prop", async () => {
      const el = await renderTag({ variant: "solid", color: "success", customColor: "--ui-info" });
      expect(getComputedStyle(el).backgroundColor).toBe(tokenAsColor("--ui-info"));
    });

    it("works with a token the TagColor union does not cover", async () => {
      const el = await renderTag({ variant: "solid", customColor: "--ui-primary-hover" });
      expect(getComputedStyle(el).backgroundColor).toBe(tokenAsColor("--ui-primary-hover"));
    });

    it("tints soft toward the surface", async () => {
      const el = await renderTag({ variant: "soft", customColor: "--ui-info" });
      expect(getComputedStyle(el).backgroundColor)
        .toBe(colorOf("color-mix(in oklch, var(--ui-info) 14%, var(--ui-surface))"));
    });
  });

  describe("geometry", () => {
    it("rounded and square resolve to the radius tokens", async () => {
      const rounded = await renderTag({ rounded: true });
      const square = await renderTag({ rounded: false });
      expect(getComputedStyle(square).borderTopLeftRadius)
        .toBe(tokenAsValue("border-top-left-radius", "--ui-radius"));
      expect(getComputedStyle(rounded).borderTopLeftRadius)
        .not.toBe(getComputedStyle(square).borderTopLeftRadius);
    });

    it.each([
      ["xs", "2xs", "--ui-space-2xs"],
      ["sm", "xs", "--ui-space-2xs"],
      ["md", "sm", "--ui-space-xs"],
      ["lg", "base", "--ui-space-xs"],
    ] as const)("%s sits on text-%s, its line box plus padding", async (size, step, padding) => {
      const el = await renderTag({ size });
      const style = getComputedStyle(el);
      expect(style.fontSize).toBe(tokenAsValue("font-size", `--ui-text-${step}`));
      const lineBox = parseFloat(tokenAsValue("height", `--ui-leading-${step}`));
      const pad = parseFloat(tokenAsValue("height", padding));
      expect(style.height).toBe(`${lineBox + 2 * pad}px`);
    });

    it("every variant has the same box", async () => {
      const heights = new Set<number>();
      const widths = new Set<number>();
      for (const variant of ["solid", "soft", "outline", "ghost"] as const) {
        const rect = (await renderTag({ variant })).getBoundingClientRect();
        heights.add(rect.height);
        widths.add(rect.width);
      }
      expect(heights.size).toBe(1);
      expect(widths.size).toBe(1);
    });

    it("uses the medium weight and tabular digits", async () => {
      const style = getComputedStyle(await renderTag({}));
      expect(style.fontWeight).toBe(tokenAsValue("font-weight", "--ui-weight-medium"));
      expect(style.fontVariantNumeric).toBe("tabular-nums");
    });
  });
});
