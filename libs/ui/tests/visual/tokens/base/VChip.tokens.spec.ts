import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VChip from "../../../../src/components/base/VChip.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { computed as computedValue, rawToken, tokenAsColor } from "../../../setup/tokens";

/**
 * VChip funnels every colour through four intermediate custom properties, so
 * the contract worth asserting is the mapping from `color` onto those, not the
 * final background — which also depends on the variant.
 */
const TONE_MAP = {
  default: ["--ui-foreground-muted", "--ui-foreground-secondary", "--ui-surface-raised", "--ui-foreground-inverted"],
  primary: ["--ui-primary", "--ui-primary-hover", "--ui-primary-subtle", "--ui-primary-foreground"],
  success: ["--ui-success", "--ui-success-hover", "--ui-success-subtle", "--ui-success-foreground"],
  warning: ["--ui-warning", "--ui-warning-hover", "--ui-warning-subtle", "--ui-warning-foreground"],
  danger: ["--ui-danger", "--ui-danger-hover", "--ui-danger-subtle", "--ui-danger-foreground"],
  info: ["--ui-info", "--ui-info-hover", "--ui-info-subtle", "--ui-info-foreground"],
  neutral: ["--ui-foreground-secondary", "--ui-foreground", "--ui-badge-neutral-bg", "--ui-foreground-inverted"],
} as const;

const SLOTS = ["--v-chip-tone", "--v-chip-tone-hover", "--v-chip-tone-subtle", "--v-chip-tone-fg"] as const;

describe.each(THEME_CASES)("VChip tokens — %s theme", (theme) => {
  async function renderChip(props: Record<string, unknown>): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VChip, { props: { label: "Chip", ...props } });
    return screen.container.firstElementChild as HTMLElement;
  }

  it.each(Object.entries(TONE_MAP))("colour %s maps onto its four tone slots", async (color, tokens) => {
    const el = await renderChip({ color });
    SLOTS.forEach((slot, i) => {
      expect(computedValue(el, slot), `${color} → ${slot}`).toBe(rawToken(tokens[i]));
    });
  });

  it("filled draws its background from the tone slot", async () => {
    const el = await renderChip({ variant: "filled", color: "primary" });
    expect(getComputedStyle(el).backgroundColor).toBe(tokenAsColor("--ui-primary"));
  });

  it("soft draws its background from the subtle slot", async () => {
    const el = await renderChip({ variant: "soft", color: "primary" });
    expect(getComputedStyle(el).backgroundColor).toBe(tokenAsColor("--ui-primary-subtle"));
  });

  it("outlined is transparent and neutral until selected", async () => {
    const el = await renderChip({ variant: "outlined", color: "primary" });
    const style = getComputedStyle(el);
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(style.color).toBe(tokenAsColor("--ui-foreground-secondary"));
    expect(style.borderTopColor).toBe(tokenAsColor("--ui-border"));
  });

  it("outlined picks up the tone once selected", async () => {
    const el = await renderChip({ variant: "outlined", color: "success", active: true });
    const style = getComputedStyle(el);
    expect(style.borderTopColor).toBe(tokenAsColor("--ui-success"));
    expect(style.backgroundColor).toBe(tokenAsColor("--ui-success-subtle"));
  });

  it("a default chip switches tone when selected, not just class", async () => {
    const resting = await renderChip({ color: "default" });
    const selected = await renderChip({ color: "default", selectedColor: "info", active: true });
    expect(computedValue(resting, "--v-chip-tone")).toBe(rawToken("--ui-foreground-muted"));
    expect(computedValue(selected, "--v-chip-tone")).toBe(rawToken("--ui-info"));
  });

  it.each(["sm", "md", "lg"] as const)("size %s has a distinct height", async (size) => {
    const el = await renderChip({ size });
    expect(getComputedStyle(el).height).not.toBe("auto");
  });

  it("every size resolves to a different height", async () => {
    const heights = [];
    for (const size of ["sm", "md", "lg"] as const) {
      const el = await renderChip({ size });
      heights.push(getComputedStyle(el).height);
    }
    expect(new Set(heights).size).toBe(3);
  });
});
