import { h } from "vue";

import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-vue";

import VButton from "../../../../src/components/base/VButton.vue";
import VButtonGroup from "../../../../src/components/base/VButtonGroup.vue";
import { applyTheme, THEME_CASES } from "../../../setup/theme";
import { tokenAsColor, tokenAsValue } from "../../../setup/tokens";

/**
 * The modern chrome's tonal variants are the one place in the library where a
 * component's colour is an *expression* over a token rather than the token
 * itself. `tokenAsColor` only resolves `var(--x)`, so these need a probe that
 * takes the whole `color-mix(...)` — otherwise the only way to write the
 * expectation is to hardcode Chromium's serialisation of it, which is exactly
 * the kind of literal these tests exist to catch.
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

/** variant → the status token its tonal treatment is mixed from. */
const TONAL = {
  warning: "--ui-warning",
  negative: "--ui-danger",
  positive: "--ui-success",
} as const;

describe.each(THEME_CASES)("VButton modern chrome — %s theme", (theme) => {
  async function renderButton(props: Record<string, unknown>): Promise<HTMLElement> {
    await applyTheme(theme);
    // `modern` is the default here, unlike so-platform. Passed explicitly all
    // the same: this file is the contract for the chrome, not for the default.
    const screen = render(VButton, { props: { text: "Label", modern: true, ...props } });
    return screen.container.firstElementChild as HTMLElement;
  }

  it("is what a button with no chrome prop gets", async () => {
    await applyTheme(theme);
    const el = render(VButton, { props: { text: "Label" } })
      .container.firstElementChild as HTMLElement;
    expect(el.classList.contains("v-button--modern")).toBe(true);
    expect(getComputedStyle(el).height).toBe("30px");
  });

  it("keeps the filled primary on its own token pair", async () => {
    const el = await renderButton({ variant: "primary" });
    const style = getComputedStyle(el);
    expect(style.backgroundColor).toBe(tokenAsColor("--ui-primary"));
    expect(style.color).toBe(tokenAsColor("--ui-primary-foreground"));
    // The hairline is one step darker than the fill, not the fill itself — that
    // half-step is what separates a modern button from its own background.
    expect(style.borderTopColor).toBe(tokenAsColor("--ui-primary-hover"));
  });

  it("thins the border to a hairline", async () => {
    const modern = await renderButton({ variant: "primary" });
    expect(getComputedStyle(modern).borderTopWidth).toBe("1px");

    await applyTheme(theme);
    const legacy = render(VButton, {
      props: { text: "Label", variant: "primary", modern: false },
    }).container.firstElementChild as HTMLElement;
    expect(getComputedStyle(legacy).borderTopWidth).toBe("2px");
  });

  it("takes its corner from the radius scale, not a literal", async () => {
    const el = await renderButton({ variant: "primary" });
    expect(getComputedStyle(el).borderRadius)
      .toBe(tokenAsValue("border-radius", "--ui-radius-lg"));
  });

  it.each(Object.entries(TONAL))(
    "%s is a 12%% tint of %s with a 28%% edge",
    async (variant, token) => {
      const el = await renderButton({ variant });
      const style = getComputedStyle(el);
      expect(style.backgroundColor).toBe(tonal(token, 12));
      expect(style.borderTopColor).toBe(tonal(token, 28));
      // The text is the darker step of the same family — the base tone on a 12%
      // wash of itself does not clear contrast.
      expect(style.color).toBe(tokenAsColor(`${token}-hover`));
    },
  );

  it("draws neutral from the foreground, so it has no hue of its own", async () => {
    const el = await renderButton({ variant: "neutral" });
    const style = getComputedStyle(el);
    expect(style.backgroundColor).toBe(tonal("--ui-foreground", 5));
    expect(style.borderTopColor).toBe(tonal("--ui-foreground", 9));
    expect(style.color).toBe(tokenAsColor("--ui-foreground"));
  });

  it("leaves neutral on the secondary fill without the flag", async () => {
    // Deliberate: an unmigrated screen must not sprout one tonal button.
    await applyTheme(theme);
    const el = render(VButton, { props: { text: "Label", variant: "neutral", modern: false } })
      .container.firstElementChild as HTMLElement;
    expect(getComputedStyle(el).backgroundColor).toBe(tokenAsColor("--ui-border-strong"));
  });

  it("stands at 30px, and lets an explicit size override that", async () => {
    expect(getComputedStyle(await renderButton({})).height).toBe("30px");
    expect(getComputedStyle(await renderButton({ size: "sm" })).height).toBe("28px");
    expect(getComputedStyle(await renderButton({ size: "md" })).height).toBe("32px");
    expect(getComputedStyle(await renderButton({ size: "lg" })).height).toBe("40px");
  });

  it("squares an icon-only cell rather than letting it size to its glyph", async () => {
    const el = await renderButton({ text: "", icon: "lucide:plus" });
    const style = getComputedStyle(el);
    expect(style.width).toBe("30px");
    expect(style.height).toBe("30px");
  });
});

describe.each(THEME_CASES)("VButtonGroup — %s theme", (theme) => {
  async function renderGroup(count = 3): Promise<HTMLElement> {
    await applyTheme(theme);
    const screen = render(VButtonGroup, {
      slots: {
        default: () => Array.from(
          { length: count },
          (_, i) => h(VButton, { text: `Cell ${i}`, modern: true, variant: "neutral" }),
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

  it("leaves a standalone modern button its own shadow", async () => {
    await applyTheme(theme);
    const el = render(VButton, { props: { text: "Solo", modern: true, variant: "neutral" } })
      .container.firstElementChild as HTMLElement;
    expect(getComputedStyle(el).boxShadow).not.toBe("none");
  });

  it("keeps each cell's own variant colour inside the track", async () => {
    await applyTheme(theme);
    const screen = render(VButtonGroup, {
      slots: {
        default: () => [
          h(VButton, { text: "A", modern: true, variant: "warning" }),
          h(VButton, { text: "B", modern: true, variant: "neutral" }),
        ],
      },
    });
    const [warning, neutral] = cells(screen.container.firstElementChild as HTMLElement);
    expect(getComputedStyle(warning).backgroundColor).toBe(tonal("--ui-warning", 12));
    expect(getComputedStyle(neutral).backgroundColor).toBe(tonal("--ui-foreground", 5));
  });

  it("is a group with an accessible name", async () => {
    await applyTheme(theme);
    const screen = render(VButtonGroup, {
      attrs: { "aria-label": "Incident links" },
      slots: { default: () => h(VButton, { text: "A", modern: true }) },
    });
    const root = screen.container.firstElementChild as HTMLElement;
    expect(root.getAttribute("role")).toBe("group");
    expect(root.getAttribute("aria-label")).toBe("Incident links");
  });
});
