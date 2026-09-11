import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VScrollPanel from "../../../../src/components/layout/VScrollPanel.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { tokenAsColor, tokenAsValue } from "../../../setup/tokens";

const CONTENT = "<div style='height: 400px'>Payload</div>";

describe.each(THEME_CASES)("VScrollPanel copy button — %s theme", (theme) => {
  async function renderPanel(props: Record<string, unknown> = {}): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VScrollPanel, {
      props: { maxHeight: "120px", ...props },
      slots: { default: CONTENT },
    });
    return screen.container.firstElementChild as HTMLElement;
  }

  const button = (root: HTMLElement) =>
    root.querySelector<HTMLElement>(".v-scroll-panel__copy-btn");

  it("renders only when there is something to copy", async () => {
    expect(button(await renderPanel())).toBeNull();
    expect(button(await renderPanel({ copyText: "abc" }))).not.toBeNull();
  });

  it("sits at the top-right without taking any layout", async () => {
    // Zero-height sticky wrapper: it overlays the first line rather than pushing
    // it down, which is why callers pad their content on the right.
    const root = await renderPanel({ copyText: "abc" });
    const wrapper = root.querySelector<HTMLElement>(".v-scroll-panel__copy")!;
    expect(getComputedStyle(wrapper).position).toBe("sticky");
    expect(wrapper.getBoundingClientRect().height).toBe(0);
  });

  it("stays put when the panel is scrolled", async () => {
    // An absolutely positioned button would scroll away with the content, since
    // this element *is* the scroll container.
    const root = await renderPanel({ copyText: "abc" });
    const before = button(root)!.getBoundingClientRect().top;
    root.scrollTop = 200;
    expect(button(root)!.getBoundingClientRect().top).toBe(before);
  });

  it("is translucent, so it does not punch a hole in the text under it", async () => {
    const root = await renderPanel({ copyText: "abc" });
    const style = getComputedStyle(button(root)!);
    expect(style.backgroundColor).not.toBe(tokenAsColor("--ui-surface"));
    expect(style.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(style.backdropFilter).toContain("blur");
  });

  it("takes its colour and corner from the tokens", async () => {
    const style = getComputedStyle(button(await renderPanel({ copyText: "abc" }))!);
    expect(style.color).toBe(tokenAsColor("--ui-foreground-secondary"));
    expect(style.borderRadius).toBe(tokenAsValue("border-radius", "--ui-radius-lg"));
  });

  it("keeps both glyphs stacked in one grid cell", async () => {
    // They cross-fade in place; swapping one for the other would resize the
    // button for a frame.
    const root = await renderPanel({ copyText: "abc" });
    const [copy, check] = root.querySelectorAll<HTMLElement>(".v-scroll-panel__copy-glyph");
    // Centres, not edges: the check starts at `scale(0.7) rotate(-12deg)`, so
    // its box is smaller — it is concentric with the copy glyph, not congruent.
    const a = copy.getBoundingClientRect();
    const b = check.getBoundingClientRect();
    expect(a.left + a.width / 2).toBeCloseTo(b.left + b.width / 2, 0);
    expect(a.top + a.height / 2).toBeCloseTo(b.top + b.height / 2, 0);
  });

  it("shows the copy glyph and hides the check until there is something to report", async () => {
    const root = await renderPanel({ copyText: "abc" });
    const [copy, check] = root.querySelectorAll<HTMLElement>(".v-scroll-panel__copy-glyph");
    expect(getComputedStyle(copy).opacity).toBe("1");
    expect(getComputedStyle(check).opacity).toBe("0");
  });

  it("hides itself until the panel is hovered, on pointer devices", async () => {
    // It is chrome over someone else's content and has no business sitting
    // there permanently. The browser project is the only place this is
    // assertable — jsdom answers false to every media query.
    const root = await renderPanel({ copyText: "abc" });
    expect(getComputedStyle(button(root)!).opacity).toBe("0");
  });

  it("keeps the panel's own well unchanged", async () => {
    const withButton = await renderPanel({ copyText: "abc" });
    const without = await renderPanel();
    expect(getComputedStyle(withButton).backgroundColor)
      .toBe(getComputedStyle(without).backgroundColor);
    expect(getComputedStyle(withButton).boxShadow).toBe(getComputedStyle(without).boxShadow);
  });
});
