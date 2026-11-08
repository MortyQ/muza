import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VEmptyState from "../../../../src/components/feedback/VEmptyState.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { tokenAsColor, tokenAsValue } from "../../../setup/tokens";

describe.each(THEME_CASES)("VEmptyState tokens — %s theme", (theme) => {
  it("is one muted line on the base step", async () => {
    await applyTheme(theme);
    const screen = render(VEmptyState, { props: { text: "No orders in this period" } });
    const line = screen.container.querySelector(".v-empty-state__text");
    if (!line) throw new Error("line not rendered");

    const style = getComputedStyle(line);
    expect(style.color).toBe(tokenAsColor("--ui-foreground-muted"));
    expect(style.fontSize).toBe(tokenAsValue("font-size", "--ui-text-base"));
    expect(style.fontWeight).toBe(tokenAsValue("font-weight", "--ui-weight-regular"));
  });
});
