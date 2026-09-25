import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VComposer from "../../../../src/components/inputs/VComposer.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { tokenAsColor, tokenAsValue } from "../../../setup/tokens";

/**
 * The composer's states are carried almost entirely by its border, which makes
 * the token bindings the whole visual contract: four states, four hues, and one
 * surface tint that has to stay legible in both themes.
 */
let probe: HTMLElement | null = null;

function mixed(expression: string): string {
  if (!probe) {
    probe = document.createElement("div");
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    document.body.appendChild(probe);
  }
  probe.style.color = "";
  probe.style.color = expression;
  return getComputedStyle(probe).color;
}

const tint = (token: string, percent: number) =>
  mixed(`color-mix(in oklch, var(${token}) ${percent}%, transparent)`);

describe.each(THEME_CASES)("VComposer tokens — %s theme", (theme) => {
  async function renderComposer(props: Record<string, unknown> = {}): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VComposer, { props });
    return screen.container.firstElementChild as HTMLElement;
  }

  const find = (root: HTMLElement, selector: string) =>
    root.querySelector<HTMLElement>(selector)!;

  it("rests on the surface token behind a plain border", async () => {
    const style = getComputedStyle(await renderComposer());
    expect(style.backgroundColor).toBe(tokenAsColor("--ui-surface"));
    expect(style.borderTopColor).toBe(tokenAsColor("--ui-border"));
    expect(style.borderRadius).toBe(tokenAsValue("border-radius", "--ui-radius-lg"));
  });

  it("tints itself once sent, which is the one state that outlives the interaction", async () => {
    const el = await renderComposer({ status: "sent" });
    const style = getComputedStyle(el);
    expect(style.backgroundColor).toBe(tint("--ui-success", 6));
    expect(style.borderTopColor).toBe(tint("--ui-success", 25));
  });

  it("keeps the sent text legible against its own wash in both themes", async () => {
    // `-hover` is the darker step of the family in light and the lighter one in
    // dark, which is what makes a single rule work on both sides.
    const el = await renderComposer({ status: "sent", preview: "Sent to the brand" });
    expect(getComputedStyle(find(el, ".v-composer__preview")).color)
      .toBe(tokenAsColor("--ui-success-hover"));
  });

  it("borders in danger for a validation error and for a failed send alike", async () => {
    const invalid = await renderComposer({ error: "Required", open: true });
    const failed = await renderComposer({ status: "error" });
    const edge = tint("--ui-danger", 55);
    expect(getComputedStyle(invalid).borderTopColor).toBe(edge);
    expect(getComputedStyle(failed).borderTopColor).toBe(edge);
  });

  it("rings in the brand colour while open, and in danger when that box is invalid", async () => {
    const open = await renderComposer({ open: true });
    expect(getComputedStyle(open).boxShadow).toContain(tint("--ui-primary", 10));

    const invalid = await renderComposer({ open: true, error: "Required" });
    expect(getComputedStyle(invalid).boxShadow).toContain(tint("--ui-danger", 10));
  });

  it("draws the field on the box's own surface, with no outline of its own", async () => {
    // The box is the field's outline; a second border inside it would read as a
    // nested control.
    const field = find(await renderComposer({ open: true }), ".v-composer__field");
    const style = getComputedStyle(field);
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(style.borderTopWidth).toBe("0px");
    expect(style.color).toBe(tokenAsColor("--ui-foreground"));
  });

  it("separates the footer with the subtle border, not the plain one", async () => {
    const footer = find(await renderComposer({ open: true }), ".v-composer__footer");
    expect(getComputedStyle(footer).borderTopColor).toBe(tokenAsColor("--ui-border-subtle"));
  });
});
