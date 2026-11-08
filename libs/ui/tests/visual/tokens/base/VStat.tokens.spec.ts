import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VStat from "../../../../src/components/base/VStat.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { tokenAsColor, tokenAsValue } from "../../../setup/tokens";

describe.each(THEME_CASES)("VStat tokens — %s theme", (theme) => {
  async function renderStat(props: Record<string, unknown>): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VStat, { props: { label: "Revenue", value: "$12,400", ...props } });
    return screen.container.firstElementChild as HTMLElement;
  }

  function part(root: HTMLElement, name: string): CSSStyleDeclaration {
    const el = root.querySelector(`.v-stat__${name}`);
    if (!el) throw new Error(`${name} not rendered`);
    return getComputedStyle(el);
  }

  it.each([["md", "2xl"], ["lg", "3xl"]] as const)("a %s figure sits on the %s step", async (size, step) => {
    const figure = part(await renderStat({ size }), "figure");
    expect(figure.fontSize).toBe(tokenAsValue("font-size", `--ui-text-${step}`));
    expect(figure.lineHeight).toBe(tokenAsValue("line-height", `--ui-leading-${step}`));
  });

  it("the figure is strong foreground in tabular digits; the label regular and muted", async () => {
    const root = await renderStat({});
    const figure = part(root, "figure");
    const label = part(root, "label");
    expect(figure.fontWeight).toBe(tokenAsValue("font-weight", "--ui-weight-strong"));
    expect(figure.fontVariantNumeric).toBe("tabular-nums");
    expect(figure.color).toBe(tokenAsColor("--ui-foreground"));
    expect(label.fontWeight).toBe(tokenAsValue("font-weight", "--ui-weight-regular"));
    expect(label.color).toBe(tokenAsColor("--ui-foreground-muted"));
  });

  it("label and figure stand 2px apart", async () => {
    expect(getComputedStyle(await renderStat({})).rowGap).toBe(tokenAsValue("row-gap", "--ui-space-2xs"));
  });

  it("tone danger colours the figure, not the label", async () => {
    const root = await renderStat({ tone: "danger" });
    expect(part(root, "figure").color).toBe(tokenAsColor("--ui-danger"));
    expect(part(root, "label").color).toBe(tokenAsColor("--ui-foreground-muted"));
  });
});
