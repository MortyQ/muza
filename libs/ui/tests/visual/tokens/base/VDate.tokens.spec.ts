import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VDate from "../../../../src/components/base/VDate.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { tokenAsColor } from "../../../setup/tokens";

describe.each(THEME_CASES)("VDate tokens — %s theme", (theme) => {
  async function renderDate(props: Record<string, unknown>): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VDate, { props });
    return screen.container.firstElementChild as HTMLElement;
  }

  it("gives timestamps tabular figures so a column of them aligns", async () => {
    const el = await renderDate({ value: "2026-03-14T18:40:00Z" });
    expect(getComputedStyle(el).fontVariantNumeric).toContain("tabular-nums");
  });

  it("inherits its colour rather than claiming one", async () => {
    // A timestamp is usually a table cell's own text; the component owning a
    // colour would fight whatever cell it lands in.
    const el = await renderDate({ value: "2026-03-14T18:40:00Z" });
    const inherited = getComputedStyle(el.parentElement!).color;
    expect(getComputedStyle(el).color).toBe(inherited);
  });

  it("steps the em dash back to the secondary text token", async () => {
    const el = await renderDate({ value: null });
    expect(getComputedStyle(el).color).toBe(tokenAsColor("--ui-foreground-secondary"));
    expect(getComputedStyle(el).color).not.toBe(tokenAsColor("--ui-foreground"));
  });
});
