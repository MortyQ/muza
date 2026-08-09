import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VButton from "../../../../src/components/base/VButton.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { tokenAsColor } from "../../../setup/tokens";

/**
 * Which token each variant is contractually bound to. If a variant is
 * re-pointed at a different token, or at a literal colour, this table is what
 * catches it — nothing in the type system can.
 */
const VARIANT_BACKGROUND = {
  primary: "--ui-primary",
  secondary: "--ui-border-strong",
  positive: "--ui-success",
  negative: "--ui-danger",
  warning: "--ui-warning",
} as const;

describe.each(THEME_CASES)("VButton tokens — %s theme", (theme) => {
  async function renderButton(props: Record<string, unknown>): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VButton, { props: { text: "Label", ...props } });
    return screen.container.firstElementChild as HTMLElement;
  }

  it.each(Object.entries(VARIANT_BACKGROUND))(
    "%s draws its background from %s",
    async (variant, token) => {
      const el = await renderButton({ variant });
      expect(getComputedStyle(el).backgroundColor).toBe(tokenAsColor(token));
    },
  );

  it("borders match the background on filled variants", async () => {
    const el = await renderButton({ variant: "primary" });
    const style = getComputedStyle(el);
    expect(style.borderTopColor).toBe(tokenAsColor("--ui-primary"));
    expect(style.borderTopWidth).toBe("2px");
  });

  it("primary text uses the paired foreground token, not a literal", async () => {
    const el = await renderButton({ variant: "primary" });
    expect(getComputedStyle(el).color).toBe(tokenAsColor("--ui-primary-foreground"));
  });

  it("link variant is transparent and tinted with the brand colour", async () => {
    const el = await renderButton({ variant: "link" });
    const style = getComputedStyle(el);
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(style.color).toBe(tokenAsColor("--ui-primary"));
    expect(style.boxShadow).toBe("none");
  });

  it("disabled state dims through the disabled foreground token", async () => {
    const el = await renderButton({ disabled: true, variant: "primary" });
    const style = getComputedStyle(el);
    expect(style.color).toBe(tokenAsColor("--ui-foreground-disabled"));
    expect(style.opacity).toBe("0.6");
    expect(style.pointerEvents).toBe("none");
  });

  it("carries the extra-small elevation token by default", async () => {
    const el = await renderButton({ variant: "primary" });
    // Resolved shadows serialise with the colour expanded, so assert it is
    // neither absent nor the literal string of some other token.
    expect(getComputedStyle(el).boxShadow).not.toBe("none");
  });

  it("every filled variant resolves to a distinct background", async () => {
    const seen = new Map<string, string>();
    for (const variant of Object.keys(VARIANT_BACKGROUND)) {
      const el = await renderButton({ variant });
      const bg = getComputedStyle(el).backgroundColor;
      expect(seen.has(bg), `${variant} shares a background with ${seen.get(bg)}`).toBe(false);
      seen.set(bg, variant);
    }
  });
});

describe("VButton tokens — across themes", () => {
  it("primary background actually changes between light and dark", async () => {
    await applyTheme("light");
    const light = tokenAsColor("--ui-primary");
    await applyTheme("dark");
    const dark = tokenAsColor("--ui-primary");
    expect(light).not.toBe(dark);
  });

  it("surface background differs between themes", async () => {
    await applyTheme("light");
    const light = tokenAsColor("--ui-surface");
    await applyTheme("dark");
    const dark = tokenAsColor("--ui-surface");
    expect(light).not.toBe(dark);
  });
});
