import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VSelect from "../../../../src/components/inputs/VSelect.vue";
import type { SelectOption } from "../../../../src/types/select";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { tokenAsColor, tokenAsValue } from "../../../setup/tokens";

const OPTIONS: SelectOption[] = [
  { label: "Amazon", value: "amazon" },
  { label: "Walmart", value: "walmart" },
];

/**
 * The select carries the same 30px / 8px / 13px chrome as `VButton`, which is
 * the whole point: a filter select and a neutral button in one toolbar row have
 * to be one control family.
 *
 * What it deliberately does *not* share is the tonal fill. A text field is a
 * well you pick a value into, not a pressable surface, so the tags stay
 * transparent over the wrapper's own `--ui-input-bg` and the hairline is what
 * draws the control.
 */
describe.each(THEME_CASES)("VSelect chrome — %s theme", (theme) => {
  async function renderSelect(props: Record<string, unknown> = {}): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VSelect, { props: { options: OPTIONS, ...props } });
    return screen.container.firstElementChild as HTMLElement;
  }

  const find = (root: HTMLElement, selector: string) =>
    root.querySelector<HTMLElement>(selector)!;

  it("sits on the same field surface as VInput, not on a tonal tint", async () => {
    const el = await renderSelect();
    expect(getComputedStyle(el).backgroundColor).toBe(tokenAsColor("--ui-input-bg"));
    expect(getComputedStyle(find(el, ".multiselect__tags")).backgroundColor)
      .toBe("rgba(0, 0, 0, 0)");
  });

  it("puts the hairline on the fieldset overlay, not the fill", async () => {
    // The overlay is painted after the value; a fill there would hide it.
    const fieldset = find(await renderSelect(), ".v-select__fieldset");
    const style = getComputedStyle(fieldset);
    expect(style.borderTopColor).toBe(tokenAsColor("--ui-input-border"));
    expect(style.borderTopWidth).toBe("1px");
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });

  it("takes its corner from the radius scale", async () => {
    const el = await renderSelect();
    const radius = tokenAsValue("border-radius", "--ui-radius-lg");
    expect(getComputedStyle(find(el, ".v-select__fieldset")).borderRadius).toBe(radius);
    expect(getComputedStyle(find(el, ".multiselect__tags")).borderRadius).toBe(radius);
  });

  it("takes its height from the control scale, not a literal", async () => {
    const el = await renderSelect();
    expect(getComputedStyle(find(el, ".multiselect__tags")).minHeight)
      .toBe(tokenAsValue("min-height", "--ui-control-h"));
  });

  it("sets its type from the scale's base step", async () => {
    const el = await renderSelect();
    expect(getComputedStyle(find(el, ".multiselect__placeholder")).fontSize)
      .toBe(tokenAsValue("font-size", "--ui-text-base"));
  });

  it("matches VButton's height exactly, asserted from both sides", async () => {
    const el = await renderSelect();
    await applyTheme(theme);
    const { default: VButton } = await import("../../../../src/components/base/VButton.vue");
    const button = render(VButton, { props: { text: "Filter", variant: "neutral" } })
      .container.firstElementChild as HTMLElement;

    expect(getComputedStyle(find(el, ".multiselect__tags")).minHeight)
      .toBe(getComputedStyle(button).height);
  });

  it("grows past 30px rather than clipping a second row of chips", async () => {
    // Which is why the rule is `min-height` and not `height`. Enough chips to
    // wrap at any sane container width — two would sit on one row at 1280px and
    // the test would pass for the wrong reason.
    const many = Array.from({ length: 40 }, (_, i) => ({ label: `Option ${i}`, value: i }));
    const el = await renderSelect({ options: many, multiple: true, modelValue: many });
    expect(find(el, ".multiselect__tags").getBoundingClientRect().height)
      .toBeGreaterThan(30);
  });

  it("renders the floating label, which the height never ruled out", async () => {
    // The active label sits *on* the top border, outside the control's box, so
    // 30px was never the constraint an earlier revision took it for.
    const el = await renderSelect({ name: "Marketplace" });
    expect(find(el, ".v-select__label").textContent?.trim()).toBe("Marketplace");
  });

  it("thickens the focused border rather than spreading a ring", async () => {
    // A `box-shadow` ring is drawn around the whole rectangle and knows nothing
    // about the notch, so it paints straight through the label.
    const el = await renderSelect({ name: "Marketplace", modelValue: OPTIONS[0] });
    const fieldset = find(el, ".v-select__fieldset");
    fieldset.classList.add("v-select__fieldset--active");
    const style = getComputedStyle(fieldset);
    expect(style.borderTopWidth).toBe("2px");
    expect(style.borderTopColor).toBe(tokenAsColor("--ui-border-focus"));
  });
});
