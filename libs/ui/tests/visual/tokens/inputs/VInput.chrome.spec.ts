import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VButton from "../../../../src/components/base/VButton.vue";
import VInput from "../../../../src/components/inputs/VInput.vue";
import VSelect from "../../../../src/components/inputs/VSelect.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { tokenAsColor, tokenAsValue } from "../../../setup/tokens";

/**
 * The third member of the control family. Everything here is asserted against
 * the other two rather than against a number, because the only thing that makes
 * the chrome worth having is that a button, a select and a field put side by
 * side in a toolbar line up — and a literal in this file would keep passing
 * after one of them drifted.
 */
describe.each(THEME_CASES)("VInput chrome — %s theme", (theme) => {
  async function renderInput(props: Record<string, unknown> = {}): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VInput, { props });
    return screen.container.firstElementChild as HTMLElement;
  }

  const find = (root: HTMLElement, selector: string) =>
    root.querySelector<HTMLElement>(selector)!;

  it("stands at the same height as the button and the select", async () => {
    const field = find(await renderInput(), ".v-input-field");

    await applyTheme(theme);
    const button = render(VButton, { props: { text: "Go" } })
      .container.firstElementChild as HTMLElement;
    const select = render(VSelect, { props: { options: [] } })
      .container.firstElementChild as HTMLElement;

    expect(getComputedStyle(field).height).toBe(getComputedStyle(button).height);
    expect(getComputedStyle(field).height)
      .toBe(getComputedStyle(find(select, ".multiselect__tags")).minHeight);
  });

  it("is a well, not a pressable surface — the field itself draws nothing", async () => {
    // The container carries the field surface; the input over it is transparent,
    // and the hairline on the fieldset overlay is what draws the control.
    const el = await renderInput();
    expect(getComputedStyle(el.querySelector(".v-input-container")!).backgroundColor)
      .toBe(tokenAsColor("--ui-input-bg"));
    expect(getComputedStyle(find(el, ".v-input-field")).backgroundColor)
      .toBe("rgba(0, 0, 0, 0)");
  });

  it("borders through the input token, at a hairline", async () => {
    const fieldset = find(await renderInput(), ".v-fieldset");
    const style = getComputedStyle(fieldset);
    expect(style.borderTopColor).toBe(tokenAsColor("--ui-input-border"));
    expect(style.borderTopWidth).toBe("1px");
  });

  it("takes the same corner as the select's", async () => {
    const el = await renderInput();
    const radius = tokenAsValue("border-radius", "--ui-radius-lg");
    expect(getComputedStyle(find(el, ".v-fieldset")).borderRadius).toBe(radius);
  });

  it("takes its height from the control scale, not a literal", async () => {
    expect(getComputedStyle(find(await renderInput(), ".v-input-field")).height)
      .toBe(tokenAsValue("height", "--ui-control-h"));

    for (const size of ["sm", "md", "lg"] as const) {
      const field = find(await renderInput({ size }), ".v-input-field");
      expect(getComputedStyle(field).height)
        .toBe(tokenAsValue("height", `--ui-control-h-${size}`));
    }
  });

  it("sets its type from the scale's base step, and the label from the 2xs one", async () => {
    const el = await renderInput({ name: "Marketplace", modelValue: "Amazon" });
    expect(getComputedStyle(find(el, ".v-input-field")).fontSize)
      .toBe(tokenAsValue("font-size", "--ui-text-base"));
    expect(getComputedStyle(find(el, ".v-label")).fontSize)
      .toBe(tokenAsValue("font-size", "--ui-text-2xs"));
  });

  it("renders the floating label and opens the notch on a value", async () => {
    const el = await renderInput({ name: "Marketplace", modelValue: "Amazon" });
    expect(find(el, ".v-label").textContent?.trim()).toBe("Marketplace");
    expect(find(el, ".v-legend").classList.contains("v-legend--visible")).toBe(true);
  });

  it("gives the notch the width of the text sitting in it", async () => {
    // The legend has to be set in the same face and size as the active label,
    // or the border closes over the last glyph.
    const el = await renderInput({ name: "Marketplace", modelValue: "Amazon" });
    const label = getComputedStyle(find(el, ".v-label"));
    const legend = getComputedStyle(find(el, ".v-legend"));
    expect(legend.fontSize).toBe(label.fontSize);
    expect(legend.fontWeight).toBe(label.fontWeight);
  });

  it("renders no label at all without a `name`", async () => {
    expect((await renderInput()).querySelector(".v-label")).toBeNull();
  });

  it("turns the border red on an error rather than tinting the fill", async () => {
    const el = await renderInput({ error: "Required" });
    const style = getComputedStyle(find(el, ".v-fieldset"));
    expect(style.borderTopColor).toBe(tokenAsColor("--ui-danger"));
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });
});
