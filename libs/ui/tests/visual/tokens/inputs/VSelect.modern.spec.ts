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
 * The modern chrome's surfaces are expressions over `--ui-foreground` rather
 * than tokens in their own right — the same tonal treatment `VButton`'s
 * `neutral` variant uses, which is the whole point: a filter select and a
 * neutral button in one toolbar row have to be one control family.
 */
let probe: HTMLElement | null = null;

function tonal(token: string, percent: number): string {
  if (!probe) {
    probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    document.body.appendChild(probe);
  }
  probe.style.color = "";
  probe.style.color = `color-mix(in oklch, var(${token}) ${percent}%, transparent)`;
  return getComputedStyle(probe).color;
}

describe.each(THEME_CASES)("VSelect modern chrome — %s theme", (theme) => {
  async function renderSelect(props: Record<string, unknown> = {}): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VSelect, { props: { options: OPTIONS, ...props } });
    return screen.container.firstElementChild as HTMLElement;
  }

  const find = (root: HTMLElement, selector: string) =>
    root.querySelector<HTMLElement>(selector)!;

  it("is on without asking", async () => {
    const el = await renderSelect();
    expect(el.classList.contains("v-select--modern")).toBe(true);
  });

  it("draws its surface from the foreground, so it has no hue of its own", async () => {
    const el = await renderSelect();
    expect(getComputedStyle(find(el, ".multiselect__tags")).backgroundColor)
      .toBe(tonal("--ui-foreground", 5));
  });

  it("matches the tonal fill a neutral modern button gets", async () => {
    // Literally the same expression, asserted from both sides so the two cannot
    // drift apart without one of these failing.
    const el = await renderSelect();
    const select = getComputedStyle(find(el, ".multiselect__tags")).backgroundColor;

    await applyTheme(theme);
    const { default: VButton } = await import("../../../../src/components/base/VButton.vue");
    const button = render(VButton, { props: { text: "Filter", variant: "neutral" } })
      .container.firstElementChild as HTMLElement;

    expect(select).toBe(getComputedStyle(button).backgroundColor);
  });

  it("puts the hairline on the fieldset overlay, not the fill", async () => {
    // The overlay is painted after the value; a fill there would hide it.
    const fieldset = find(await renderSelect(), ".v-select__fieldset");
    expect(getComputedStyle(fieldset).borderTopColor).toBe(tonal("--ui-foreground", 9));
    expect(getComputedStyle(fieldset).borderTopWidth).toBe("1px");
    expect(getComputedStyle(fieldset).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });

  it("takes its corner from the radius scale", async () => {
    const el = await renderSelect();
    const radius = tokenAsValue("border-radius", "--ui-radius-lg");
    expect(getComputedStyle(find(el, ".v-select__fieldset")).borderRadius).toBe(radius);
    expect(getComputedStyle(find(el, ".multiselect__tags")).borderRadius).toBe(radius);
  });

  it("stands 30px tall, matching the modern button beside it", async () => {
    const el = await renderSelect();
    expect(getComputedStyle(find(el, ".multiselect__tags")).minHeight).toBe("30px");
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

  it("steps back to the 44px legacy control on request", async () => {
    await applyTheme(theme);
    const legacy = render(VSelect, { props: { options: OPTIONS, modern: false } })
      .container.firstElementChild as HTMLElement;
    expect(getComputedStyle(find(legacy, ".multiselect__tags")).minHeight).toBe("44px");
  });

  it("keeps the legacy border token when the chrome is off", async () => {
    await applyTheme(theme);
    const legacy = render(VSelect, { props: { options: OPTIONS, modern: false } })
      .container.firstElementChild as HTMLElement;
    expect(getComputedStyle(find(legacy, ".v-select__fieldset")).borderTopColor)
      .toBe(tokenAsColor("--ui-input-border"));
  });

  it("renders no floating label, whatever `name` says", async () => {
    // The notch needs vertical room 30px does not have.
    const el = await renderSelect({ name: "Marketplace" });
    expect(el.querySelector(".v-select__label")).toBeNull();
  });
});
