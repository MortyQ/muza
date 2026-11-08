import { nextTick } from "vue";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VCount from "../../../../src/components/base/VCount.vue";
import { applyTheme } from "../../../setup/theme";

/**
 * The roll itself is timing and cannot be asserted here — the browser setup
 * kills every animation. What can be: a rolling column is exactly one line box
 * and clips its reel, and the figure does not change height mid-roll.
 */
describe("VCount geometry", () => {
  async function rolling(): Promise<HTMLElement> {
    await applyTheme("light");
    const host = document.createElement("div");
    host.style.fontSize = "24px";
    host.style.lineHeight = "32px";
    document.body.appendChild(host);

    const screen = render(VCount, { props: { value: "$1,234" }, container: host });
    await screen.rerender({ value: "$1,299" });
    await nextTick();
    return host;
  }

  it("a rolling column is one line box tall and clips its reel", async () => {
    const host = await rolling();
    const column = host.querySelector(".v-count__column");
    if (!column) throw new Error("no column rolled");

    expect(column.getBoundingClientRect().height).toBeCloseTo(32, 0);
    expect(getComputedStyle(column).overflow).toBe("hidden");
    const reel = column.querySelector(".v-count__reel");
    expect(reel?.getBoundingClientRect().height).toBeCloseTo(64, 0);
  });

  it("the figure keeps its height while rolling", async () => {
    const host = await rolling();
    const figure = host.querySelector(".v-count");
    expect(figure?.getBoundingClientRect().height).toBeCloseTo(32, 0);
  });

  it("uses tabular digits, so unchanged columns hold still", async () => {
    const host = await rolling();
    const figure = host.querySelector(".v-count");
    if (!figure) throw new Error("not rendered");
    expect(getComputedStyle(figure).fontVariantNumeric).toBe("tabular-nums");
  });
});
