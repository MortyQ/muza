import { defineComponent, h } from "vue";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VIcon from "../../../../src/components/base/VIcon.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";

/**
 * An icon beside a label is centred on the label's line in a flex row (the
 * shape every library row takes), and it does not shrink when space runs out.
 */
describe.each(THEME_CASES)("VIcon geometry — %s theme", (theme) => {
  const centre = (rect: DOMRect) => rect.top + rect.height / 2;

  const mountLine = async (display: "flex" | "block", width = "8rem") => {
    await applyTheme(theme);
    const Line = defineComponent(() => () => h("p", {
      class: "line",
      style: {
        display,
        alignItems: display === "flex" ? "center" : undefined,
        gap: "var(--ui-space-xs)",
        margin: "0",
        fontSize: "var(--ui-text-base)",
        lineHeight: "var(--ui-leading-base)",
        width,
      },
    }, [h(VIcon, { icon: "lucide:check" }), h("span", { class: "label" }, "Revenue by channel, all regions")]));
    const root = render(Line).container.querySelector(".line") as HTMLElement;
    return {
      icon: root.querySelector(".v-icon") as SVGElement,
      label: root.querySelector(".label") as HTMLElement,
    };
  };

  it("defaults to 16px", async () => {
    const { icon } = await mountLine("block");
    const rect = icon.getBoundingClientRect();
    expect(rect.width).toBe(16);
    expect(rect.height).toBe(16);
  });

  it("centres on the label's line in a flex row", async () => {
    const { icon, label } = await mountLine("flex", "auto");
    expect(Math.abs(centre(icon.getBoundingClientRect()) - centre(label.getBoundingClientRect())))
      .toBeLessThanOrEqual(1);
  });

  it("holds its 16px when the label beside it has to wrap", async () => {
    const { icon } = await mountLine("flex", "6rem");
    expect(icon.getBoundingClientRect().width).toBe(16);
  });
});
