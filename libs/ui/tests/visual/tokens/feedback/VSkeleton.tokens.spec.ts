import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VSkeleton from "../../../../src/components/feedback/VSkeleton.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { tokenAsColor, tokenAsValue } from "../../../setup/tokens";

const px = (token: string): number => parseFloat(tokenAsValue("height", token));

describe.each(THEME_CASES)("VSkeleton tokens — %s theme", (theme) => {
  async function renderIt(props: Record<string, unknown>): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VSkeleton, { props });
    return screen.container.firstElementChild as HTMLElement;
  }

  it("fills with the sunken surface", async () => {
    const el = await renderIt({});
    expect(getComputedStyle(el).backgroundColor).toBe(tokenAsColor("--ui-surface-sunken"));
  });

  // The sunken surface has to read against the card it sits on, in both themes.
  it("differs from the surface it sits on", async () => {
    expect(tokenAsColor("--ui-surface-sunken")).not.toBe(tokenAsColor("--ui-surface"));
  });

  // The skeleton keeps its size names; sm, 2xl and 3xl draw the step each
  // collapsed onto when the type scale lost them.
  it.each([
    ["xs", "xs"], ["sm", "xs"], ["base", "base"], ["lg", "lg"],
    ["xl", "xl"], ["2xl", "xl"], ["3xl", "display"],
  ] as const)(
    "a %s line is exactly the line box of the %s step, painting the glyph band",
    async (size, step) => {
      const el = await renderIt({ size, width: "6rem" });
      const style = getComputedStyle(el);
      const leading = px(`--ui-leading-${step}`);
      const text = px(`--ui-text-${step}`);
      expect(el.getBoundingClientRect().height).toBeCloseTo(leading, 1);
      expect(parseFloat(style.paddingTop)).toBeCloseTo((leading - text) / 2, 1);
      expect(style.backgroundClip).toBe("content-box");
      expect(el.getBoundingClientRect().width).toBeCloseTo(96, 1);
    },
  );

  it("a disc is round and defaults to the control height", async () => {
    const el = await renderIt({ shape: "disc" });
    const rect = el.getBoundingClientRect();
    expect(rect.width).toBeCloseTo(px("--ui-control-h"), 1);
    expect(rect.height).toBeCloseTo(rect.width, 1);
    expect(getComputedStyle(el).borderTopLeftRadius)
      .toBe(tokenAsValue("border-top-left-radius", "--ui-radius-full"));
  });

  it("a block takes the box it is given", async () => {
    const el = await renderIt({ shape: "block", width: "10rem", height: "4rem" });
    const rect = el.getBoundingClientRect();
    expect(rect.width).toBeCloseTo(160, 1);
    expect(rect.height).toBeCloseTo(64, 1);
  });
});
