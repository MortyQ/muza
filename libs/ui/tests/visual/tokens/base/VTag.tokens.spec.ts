import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VTag from "../../../../src/components/base/VTag.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { tokenAsColor } from "../../../setup/tokens";

/** color → [solid bg, solid fg, soft bg, soft fg, outline border/fg] */
const PALETTE = {
  primary: ["--ui-primary", "--ui-primary-foreground", "--ui-primary-subtle", "--ui-primary"],
  success: ["--ui-success", "--ui-success-foreground", "--ui-success-muted", "--ui-success"],
  warning: ["--ui-warning", "--ui-warning-foreground", "--ui-warning-muted", "--ui-warning"],
  error: ["--ui-danger", "--ui-danger-foreground", "--ui-danger-muted", "--ui-danger"],
  info: ["--ui-info", "--ui-info-foreground", "--ui-info-muted", "--ui-info"],
} as const;

describe.each(THEME_CASES)("VTag tokens — %s theme", (theme) => {
  async function renderTag(props: Record<string, unknown>): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VTag, { props: { label: "Tag", ...props } });
    return screen.container.firstElementChild as HTMLElement;
  }

  it.each(Object.entries(PALETTE))("solid %s uses its status pair", async (color, tokens) => {
    const el = await renderTag({ variant: "solid", color });
    const style = getComputedStyle(el);
    expect(style.backgroundColor).toBe(tokenAsColor(tokens[0]));
    expect(style.color).toBe(tokenAsColor(tokens[1]));
  });

  it.each(Object.entries(PALETTE))("soft %s tints the background and keeps the tone as text", async (color, tokens) => {
    const el = await renderTag({ variant: "soft", color });
    const style = getComputedStyle(el);
    expect(style.backgroundColor).toBe(tokenAsColor(tokens[2]));
    expect(style.color).toBe(tokenAsColor(tokens[3]));
  });

  it.each(Object.entries(PALETTE))("outline %s draws a border in the tone over nothing", async (color, tokens) => {
    const el = await renderTag({ variant: "outline", color });
    const style = getComputedStyle(el);
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(style.borderTopColor).toBe(tokenAsColor(tokens[3]));
    expect(style.color).toBe(tokenAsColor(tokens[3]));
  });

  it("neutral and gray both fall back to the badge tokens in soft", async () => {
    for (const color of ["neutral", "gray"] as const) {
      const el = await renderTag({ variant: "soft", color });
      expect(getComputedStyle(el).backgroundColor).toBe(tokenAsColor("--ui-badge-neutral-bg"));
      expect(getComputedStyle(el).color).toBe(tokenAsColor("--ui-badge-neutral-text"));
    }
  });

  describe("customColor", () => {
    it("takes over from the colour prop", async () => {
      const el = await renderTag({ variant: "solid", color: "success", customColor: "--ui-info" });
      expect(getComputedStyle(el).backgroundColor).toBe(tokenAsColor("--ui-info"));
    });

    it("works with a token the TagColor union does not cover", async () => {
      const el = await renderTag({ variant: "solid", customColor: "--ui-primary-hover" });
      expect(getComputedStyle(el).backgroundColor).toBe(tokenAsColor("--ui-primary-hover"));
    });
  });

  describe("shape and size", () => {
    it("rounded and square resolve to different radii", async () => {
      const rounded = await renderTag({ rounded: true });
      const square = await renderTag({ rounded: false });
      expect(getComputedStyle(rounded).borderRadius)
        .not.toBe(getComputedStyle(square).borderRadius);
    });

    it("every size resolves to a different font size", async () => {
      const sizes = new Set<string>();
      for (const size of ["xs", "sm", "md", "lg"] as const) {
        const el = await renderTag({ size });
        sizes.add(getComputedStyle(el).fontSize);
      }
      expect(sizes.size).toBe(4);
    });
  });
});
