import { h } from "vue";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VButton from "../../../../src/components/base/VButton.vue";
import VButtonGroup from "../../../../src/components/base/VButtonGroup.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { tokenAsColor, tokenAsValue } from "../../../setup/tokens";

/**
 * There is one chrome and no prop to choose another, so this file is the whole
 * colour contract for the button.
 *
 * The tonal variants are the one place in the library where a component's
 * colour is an *expression* over a token rather than the token itself.
 * `tokenAsColor` only resolves `var(--x)`, so these need a probe that takes the
 * whole `color-mix(...)` — otherwise the only way to write the expectation is to
 * hardcode Chromium's serialisation of it, which is exactly the kind of literal
 * these tests exist to catch.
 */
let probe: HTMLElement | null = null;

function asColor(expression: string): string {
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

const tonal = (token: string, percent: number) =>
  asColor(`color-mix(in oklch, var(${token}) ${percent}%, transparent)`);

/**
 * variant → the hue its tonal treatment is mixed from. One recipe for all five:
 * a 9% fill, a 16% hairline, and the hue's own darker step as the text tone.
 * `neutral` runs the same recipe at half the alpha and is asserted separately.
 */
const TONAL = {
  primary: "--ui-primary",
  info: "--ui-info",
  positive: "--ui-success",
  warning: "--ui-warning",
  negative: "--ui-danger",
} as const;

describe.each(THEME_CASES)("VButton tokens — %s theme", (theme) => {
  async function renderButton(props: Record<string, unknown> = {}): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VButton, { props: { text: "Label", ...props } });
    return screen.container.firstElementChild as HTMLElement;
  }

  it.each(Object.entries(TONAL))(
    "%s is a 9%% tint of %s behind a 16%% edge",
    async (variant, token) => {
      const el = await renderButton({ variant });
      const style = getComputedStyle(el);
      expect(style.backgroundColor).toBe(tonal(token, 9));
      expect(style.borderTopColor).toBe(tonal(token, 16));
      // The text is the darker step of the same family — the base tone on a 9%
      // wash of itself does not clear contrast.
      expect(style.color).toBe(tokenAsColor(`${token}-hover`));
    },
  );

  it("draws neutral from the foreground, so it has no hue of its own", async () => {
    const el = await renderButton({ variant: "neutral" });
    const style = getComputedStyle(el);
    // Half the alpha of a saturated hue: `--ui-foreground` is near-black on a
    // near-white page, where 9% would read as grey paint rather than a tint.
    expect(style.backgroundColor).toBe(tonal("--ui-foreground", 4));
    expect(style.borderTopColor).toBe(tonal("--ui-foreground", 8));
    expect(style.color).toBe(tokenAsColor("--ui-foreground"));
  });

  it("keeps secondary filled — the one variant outside the tonal system", async () => {
    const el = await renderButton({ variant: "secondary" });
    const style = getComputedStyle(el);
    expect(style.backgroundColor).toBe(tokenAsColor("--ui-border-strong"));
    expect(style.color).toBe(tokenAsColor("--ui-foreground-inverted"));
  });

  it("treats `default` as the primary tint, not a colour of its own", async () => {
    const el = await renderButton({ variant: "default" });
    expect(getComputedStyle(el).backgroundColor).toBe(tonal("--ui-primary", 9));
  });

  it("link variant is transparent and tinted with the brand colour", async () => {
    const el = await renderButton({ variant: "link" });
    const style = getComputedStyle(el);
    expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(style.color).toBe(tokenAsColor("--ui-primary"));
    expect(style.boxShadow).toBe("none");
  });

  it("draws the link underline beneath the text, not through it", async () => {
    // The link has no fixed height — it is as tall as its line of text — so an
    // underline pinned a fixed distance up from the bottom ran through the glyphs.
    const el = await renderButton({ variant: "link", text: "Reset sort" });
    const line = getComputedStyle(el, "::after");
    const underlineTop = el.getBoundingClientRect().bottom
      - Number.parseFloat(line.bottom) - Number.parseFloat(line.height);

    const text = document.createRange();
    text.selectNodeContents(el);
    expect(underlineTop).toBeGreaterThanOrEqual(text.getBoundingClientRect().bottom - 0.5);
  });

  it("spans the underline across the content, not the padding", async () => {
    const el = await renderButton({ variant: "link", text: "Reset sort" });
    const line = getComputedStyle(el, "::after");
    // `left` on the pseudo counts from the padding box, inside the 1px border
    const left = el.getBoundingClientRect().left
      + Number.parseFloat(getComputedStyle(el).borderLeftWidth)
      + Number.parseFloat(line.left);

    const text = document.createRange();
    text.selectNodeContents(el);
    expect(left).toBeCloseTo(text.getBoundingClientRect().left, 0);
  });

  it("dims a disabled button by opacity alone, keeping its variant's colours", async () => {
    // It used to recolour to `--ui-foreground-disabled` on top of the opacity,
    // which dimmed twice: on the filled secondary the text vanished into its
    // own fill, and in dark every disabled button was close to unreadable.
    for (const variant of ["primary", "secondary", "negative"] as const) {
      const enabled = getComputedStyle(await renderButton({ variant }));
      const disabled = getComputedStyle(await renderButton({ variant, disabled: true }));
      expect(disabled.color, variant).toBe(enabled.color);
      expect(disabled.backgroundColor, variant).toBe(enabled.backgroundColor);
      expect(disabled.opacity, variant).toBe("0.5");
      expect(disabled.pointerEvents, variant).toBe("none");
    }
  });

  it("does not dim a loading button — busy is not unavailable", async () => {
    const enabled = getComputedStyle(await renderButton({ variant: "primary" }));
    const loading = getComputedStyle(await renderButton({ variant: "primary", loading: true }));
    expect(loading.opacity).toBe("1");
    expect(loading.color).toBe(enabled.color);
    expect(loading.cursor).toBe("progress");
  });

  it("every variant resolves to a distinct background", async () => {
    const seen = new Map<string, string>();
    for (const variant of [...Object.keys(TONAL), "neutral", "secondary"]) {
      const el = await renderButton({ variant });
      const bg = getComputedStyle(el).backgroundColor;
      expect(seen.has(bg), `${variant} shares a background with ${seen.get(bg)}`).toBe(false);
      seen.set(bg, variant);
    }
  });

  it("thins the border to a hairline", async () => {
    expect(getComputedStyle(await renderButton({ variant: "primary" })).borderTopWidth)
      .toBe("1px");
  });

  it("takes its corner from the radius scale, not a literal", async () => {
    const el = await renderButton({ variant: "primary" });
    expect(getComputedStyle(el).borderRadius)
      .toBe(tokenAsValue("border-radius", "--ui-radius-lg"));
  });

  it("carries one tier of elevation, the same for every variant", async () => {
    // Resolved shadows serialise with the colour expanded, so assert it is
    // neither absent nor different between two variants of the same rank.
    const primary = getComputedStyle(await renderButton({ variant: "primary" })).boxShadow;
    const warning = getComputedStyle(await renderButton({ variant: "warning" })).boxShadow;
    expect(primary).not.toBe("none");
    expect(warning).toBe(primary);
  });

  it("takes its height from the control scale, not a literal", async () => {
    // Asserted through the token rather than against "30px": the number is
    // allowed to change, a component quietly opting out of the scale is not.
    expect(getComputedStyle(await renderButton()).height)
      .toBe(tokenAsValue("height", "--ui-control-h"));

    for (const size of ["sm", "md", "lg"] as const) {
      expect(getComputedStyle(await renderButton({ size })).height)
        .toBe(tokenAsValue("height", `--ui-control-h-${size}`));
    }
  });

  it("sets its type from the scale's base step", async () => {
    const style = getComputedStyle(await renderButton());
    expect(style.fontSize).toBe(tokenAsValue("font-size", "--ui-text-base"));
  });

  it("squares an icon-only cell rather than letting it size to its glyph", async () => {
    const el = await renderButton({ text: "", icon: "lucide:plus" });
    const style = getComputedStyle(el);
    const side = tokenAsValue("width", "--ui-control-h");
    expect(style.width).toBe(side);
    expect(style.height).toBe(side);
  });
});

describe.each(THEME_CASES)("VButtonGroup — %s theme", (theme) => {
  async function renderGroup(count = 3): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VButtonGroup, {
      slots: {
        default: () => Array.from(
          { length: count },
          (_, i) => h(VButton, { text: `Cell ${i}`, variant: "neutral" }),
        ),
      },
    });
    return screen.container.firstElementChild as HTMLElement;
  }

  const cells = (root: HTMLElement) =>
    [...root.querySelectorAll<HTMLElement>(".v-button")];

  it("rounds only the outer corners", async () => {
    const [first, middle, last] = cells(await renderGroup());
    const radius = tokenAsValue("border-radius", "--ui-radius-lg");

    expect(getComputedStyle(first).borderTopLeftRadius).toBe(radius);
    expect(getComputedStyle(first).borderTopRightRadius).toBe("0px");
    expect(getComputedStyle(middle).borderTopLeftRadius).toBe("0px");
    expect(getComputedStyle(middle).borderTopRightRadius).toBe("0px");
    expect(getComputedStyle(last).borderTopRightRadius).toBe(radius);
    expect(getComputedStyle(last).borderTopLeftRadius).toBe("0px");
  });

  it("matches the track's own radius to its cells'", async () => {
    const root = await renderGroup();
    expect(getComputedStyle(root).borderRadius)
      .toBe(tokenAsValue("border-radius", "--ui-radius-lg"));
  });

  it("overlaps adjacent hairlines into a single divider", async () => {
    const [first, second] = cells(await renderGroup());
    expect(getComputedStyle(second).marginLeft).toBe("-1px");
    expect(getComputedStyle(first).marginLeft).toBe("0px");
    // Which means the track is one border narrower than the sum of its cells.
    const root = await renderGroup(2);
    const [a, b] = cells(root);
    expect(Math.round(root.getBoundingClientRect().width))
      .toBe(Math.round(a.getBoundingClientRect().width + b.getBoundingClientRect().width - 1));
  });

  it("moves the elevation from the cells onto the track", async () => {
    // Four cells each dropping their own shadow would draw seams down the
    // inside of the track — the one place per-button elevation looks broken.
    const root = await renderGroup();
    expect(getComputedStyle(root).boxShadow).not.toBe("none");
    for (const cell of cells(root)) {
      expect(getComputedStyle(cell).boxShadow).toBe("none");
    }
  });

  it("leaves a standalone button its own shadow", async () => {
    await applyTheme(theme);
    const el = render(VButton, { props: { text: "Solo", variant: "neutral" } })
      .container.firstElementChild as HTMLElement;
    expect(getComputedStyle(el).boxShadow).not.toBe("none");
  });

  it("keeps each cell's own variant colour inside the track", async () => {
    await applyTheme(theme);
    const screen = render(VButtonGroup, {
      slots: {
        default: () => [
          h(VButton, { text: "A", variant: "warning" }),
          h(VButton, { text: "B", variant: "neutral" }),
        ],
      },
    });
    const [warning, neutral] = cells(screen.container.firstElementChild as HTMLElement);
    expect(getComputedStyle(warning).backgroundColor).toBe(tonal("--ui-warning", 9));
    expect(getComputedStyle(neutral).backgroundColor).toBe(tonal("--ui-foreground", 4));
  });

  it("is a group with an accessible name", async () => {
    await applyTheme(theme);
    const screen = render(VButtonGroup, {
      attrs: { "aria-label": "Incident links" },
      slots: { default: () => h(VButton, { text: "A" }) },
    });
    const root = screen.container.firstElementChild as HTMLElement;
    expect(root.getAttribute("role")).toBe("group");
    expect(root.getAttribute("aria-label")).toBe("Incident links");
  });
});

describe("VButton tokens — across themes", () => {
  it("primary background actually changes between light and dark", async () => {
    await applyTheme("light");
    const light = tokenAsColor("--ui-primary");
    await applyTheme("dark");
    const dark = tokenAsColor("--ui-primary");
    expect(light).not.toBe(dark);
  });

  it("surface background differs between themes", async () => {
    await applyTheme("light");
    const light = tokenAsColor("--ui-surface");
    await applyTheme("dark");
    const dark = tokenAsColor("--ui-surface");
    expect(light).not.toBe(dark);
  });
});
