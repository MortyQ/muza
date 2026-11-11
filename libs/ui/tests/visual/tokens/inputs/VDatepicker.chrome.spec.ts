import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VDatepicker from "../../../../src/components/inputs/VDatepicker.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { tokenAsColor, tokenAsValue } from "../../../setup/tokens";

/**
 * VDatepicker restyles @vuepic/vue-datepicker from outside, through `:deep()` selectors on the
 * library's own class names. Those names changed wholesale in v13 (`dp__input` → `dp--input`), and
 * nothing in the unit project can see that: jsdom applies no CSS. These contracts render the real
 * library and check that each override still lands — if the library renames a class again, they
 * go red instead of the picker silently falling back to its stock blue theme.
 */
describe.each(THEME_CASES)("VDatepicker chrome — %s theme", (theme) => {
  // `inline` renders the menu without opening it, so the calendar is in the DOM to measure.
  async function renderPicker(props: Record<string, unknown> = {}): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VDatepicker, { props: { inline: true, ...props } });
    return screen.container.firstElementChild as HTMLElement;
  }

  const find = (root: HTMLElement, selector: string): HTMLElement => {
    const el = root.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`${selector} is not rendered`);
    return el;
  };

  it("reaches the menu through the `ui` class and gives it the xl elevation", async () => {
    const menu = find(await renderPicker(), ".v-datepicker-menu");
    expect(getComputedStyle(menu).boxShadow).toBe(tokenAsValue("box-shadow", "--ui-shadow-xl"));
    expect(getComputedStyle(menu).borderRadius)
      .toBe(tokenAsValue("border-radius", "--ui-radius-lg"));
  });

  it("paints the selected day with the brand colour, not the library's blue", async () => {
    const day = find(
      await renderPicker({ modelValue: new Date(Date.UTC(2026, 0, 15)) }),
      ".dp--active",
    );
    expect(getComputedStyle(day).backgroundColor).toBe(tokenAsColor("--ui-primary"));
    expect(getComputedStyle(day).color).toBe(tokenAsColor("--ui-primary-foreground"));
  });

  it("strips the library's border off the input, which the fieldset draws instead", async () => {
    const input = find(await renderPicker({ inline: false }), ".dp--input");
    expect(getComputedStyle(input).borderTopWidth).toBe("0px");
    expect(getComputedStyle(input).color).toBe(tokenAsColor("--ui-foreground"));
  });
});
