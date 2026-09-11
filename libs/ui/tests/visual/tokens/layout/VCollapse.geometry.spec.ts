import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VCollapse from "../../../../src/components/layout/VCollapse.vue";

/**
 * VCollapse owns no colour, so there is no token contract to hold it to. What
 * there *is* — and what the unit project cannot see, because jsdom computes no
 * layout — is the `0fr → 1fr` grid trick that gets it from zero to a
 * content-derived height without measuring anything in JS.
 */
const CONTENT = "<div style='height: 120px'>Body</div>";

async function renderCollapse(props: Record<string, unknown>): Promise<HTMLElement> {
  const screen = render(VCollapse, { props, slots: { default: CONTENT } });
  return screen.container.firstElementChild as HTMLElement;
}

describe("VCollapse geometry", () => {
  it("is a grid, which is what makes the height animatable at all", async () => {
    const el = await renderCollapse({ modelValue: false });
    expect(getComputedStyle(el).display).toBe("grid");
  });

  it("collapses the row to zero without hiding the element", async () => {
    const el = await renderCollapse({ modelValue: false });
    expect(el.getBoundingClientRect().height).toBe(0);
    // Not `display: none` — the content stays laid out inside a clipped wrap, so
    // the transition has something to animate between.
    expect(getComputedStyle(el).display).not.toBe("none");
  });

  it("opens to exactly the content's height, with no pixel value anywhere", async () => {
    const el = await renderCollapse({ modelValue: true });
    expect(el.getBoundingClientRect().height).toBe(120);
  });

  it("clips the overflow while collapsed, so the content cannot bleed out", async () => {
    const el = await renderCollapse({ modelValue: false });
    const wrap = el.querySelector<HTMLElement>(".v-collapse__wrap")!;
    expect(getComputedStyle(wrap).overflow).toBe("hidden");
  });

  it("fades the content as well as opening the fold", async () => {
    // So the text does not appear to slide out from under the fold. The timing
    // of that fade is not assertable here — `tests/setup/browser.ts` kills every
    // transition so screenshots are deterministic — but which end state each
    // half of the pair lands on is.
    const collapsed = await renderCollapse({ modelValue: false, duration: 200 });
    expect(getComputedStyle(collapsed.querySelector(".v-collapse__content")!).opacity)
      .toBe("0");

    const expanded = await renderCollapse({ modelValue: true, duration: 200 });
    expect(getComputedStyle(expanded.querySelector(".v-collapse__content")!).opacity)
      .toBe("1");
  });

  it("derives every duration from the one prop", async () => {
    // Both transitions read the same custom property — the content's is
    // `calc(var(...) * 0.6)` — so the prop is the only dial, and a caller cannot
    // end up with a fold and a fade on different clocks.
    const el = await renderCollapse({ modelValue: false, duration: 500 });
    expect(getComputedStyle(el).getPropertyValue("--v-collapse-duration").trim())
      .toBe("500ms");
  });

  it("still reaches the open height with the content unmounted while closed", async () => {
    const closed = await renderCollapse({ modelValue: false, unmount: true });
    expect(closed.getBoundingClientRect().height).toBe(0);

    const open = await renderCollapse({ modelValue: true, unmount: true });
    expect(open.getBoundingClientRect().height).toBe(120);
  });
});
