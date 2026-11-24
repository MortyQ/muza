import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The palette's legibility, asserted on the values themselves.
 *
 * The token contracts prove a component reads the right token; nothing there
 * says the token's value can be read. This reads `theme.css` as text, turns
 * each `oklch()` into a WCAG luminance and checks the pairs the spec
 * `config-theme-palette` names. A palette edit that drops a pair below its
 * minimum fails here instead of shipping.
 */

const THEME = readFileSync(
  resolve(__dirname, "../../../config/src/tailwind/theme.css"),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

const block = (selector: string): Record<string, string> => {
  const start = THEME.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`theme.css has no block for ${selector}`);
  const body = THEME.slice(start, THEME.indexOf("}", start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
      name,
      value.replace(/\s+/g, " ").trim(),
    ]),
  );
};

const THEMES = {
  light: block(":root,\n:root[data-theme=\"light\"]"),
  dark: block(":root[data-theme=\"dark\"]"),
};

interface Oklch { l: number, c: number, h: number }

const parse = (value: string): Oklch | null => {
  const match = /^oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)$/.exec(value);
  if (!match) return null;
  return { l: Number(match[1]) / 100, c: Number(match[2]), h: Number(match[3]) };
};

/** WCAG relative luminance of an oklch colour, clamped into sRGB. */
const luminance = ({ l, c, h }: Oklch): number => {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const lc = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mc = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sc = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const r = clamp(4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc);
  const g = clamp(-1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc);
  const bl = clamp(-0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
};

const colour = (theme: keyof typeof THEMES, name: string): Oklch => {
  const value = THEMES[theme][name];
  const parsed = value ? parse(value) : null;
  if (!parsed) throw new Error(`--${name} in ${theme} is not a plain oklch() colour: ${value}`);
  return parsed;
};

const contrast = (x: number, y: number): number =>
  (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);

const ratio = (theme: keyof typeof THEMES, fg: string, bg: string): number =>
  contrast(luminance(colour(theme, fg)), luminance(colour(theme, bg)));

/**
 * Luminance of a tone laid over a surface at `alpha`, the way
 * `color-mix(in oklch, tone N%, transparent)` composites. Mixing luminances
 * rather than encoded channels is a few hundredths off for a 9–15% tint, well
 * inside the margin these pairs keep.
 */
const tinted = (theme: keyof typeof THEMES, tone: string, alpha: number): number =>
  alpha * luminance(colour(theme, tone)) + (1 - alpha) * luminance(colour(theme, "surface"));

const STATUSES = ["success", "warning", "danger", "info"] as const;

const TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ...["foreground", "foreground-secondary", "foreground-muted"].flatMap(fg =>
    ["background", "surface"].map(bg => [fg, bg] as const)),
  ...["primary", ...STATUSES].flatMap(tone => [
    [tone, "surface"] as const,
    [tone, `${tone}-subtle`] as const,
    [`${tone}-foreground`, tone] as const,
  ]),
  // The secondary button: inverted text on a muted fill.
  ["foreground-inverted", "foreground-muted"],
];

describe.each(["light", "dark"] as const)("%s theme contrast", (theme) => {
  it.each(TEXT_PAIRS)("text --%s on --%s reaches 4.5:1", (fg, bg) => {
    expect(ratio(theme, fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  // Tonal buttons, tags, chips and the active nav item: text in -hover on the
  // tone at 9% at rest and 15% on hover.
  it.each(["primary", ...STATUSES])("tonal --%s-hover text reaches 4.5:1 on its tint", (tone) => {
    const text = luminance(colour(theme, `${tone}-hover`));
    for (const alpha of [0.09, 0.15]) {
      expect(contrast(text, tinted(theme, tone, alpha))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("draws the field border at 3:1, and no heavier than it needs to be", () => {
    const value = ratio(theme, "input-border", "input-bg");
    expect(value).toBeGreaterThanOrEqual(3);
    expect(value).toBeLessThanOrEqual(3.2);
  });

  // The dashboard stacks three planes: the frame (sunken), the content panel
  // (background) and cards and tables (surface). Each must step away from the
  // one beneath it, or a card reads as part of the page.
  it("keeps the frame, the page and a card on three distinct planes", () => {
    const [frame, page, card] = ["surface-sunken", "background", "surface"]
      .map(name => luminance(colour(theme, name)));
    expect(frame).toBeLessThan(page);
    expect(page).toBeLessThan(card);
    expect(contrast(frame, page)).toBeGreaterThanOrEqual(1.05);
    expect(contrast(page, card)).toBeGreaterThanOrEqual(1.05);
  });

  it("draws the focus border at 3:1 against a surface", () => {
    expect(ratio(theme, "border-focus", "surface")).toBeGreaterThanOrEqual(3);
  });

  it("keeps no violet from the previous palette", () => {
    const violet = Object.entries(THEMES[theme])
      .map(([name, value]) => [name, parse(value)] as const)
      .filter(([, value]) => value && value.c > 0.01 && value.h >= 269.5 && value.h <= 280.5)
      .map(([name]) => name);
    expect(violet).toEqual([]);
  });
});

it("keeps a card's or table's subtle edge visible on its dark surface", () => {
  expect(ratio("dark", "border-subtle", "surface")).toBeGreaterThanOrEqual(1.15);
});

it("makes the dark sidebar the darkest plane", () => {
  expect(luminance(colour("dark", "nav"))).toBeLessThan(luminance(colour("dark", "background")));
});

it("gives every colour token a fallback equal to its light-theme value", () => {
  const tokens = readFileSync(resolve(__dirname, "../../src/styles/tokens.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const drift = [...tokens.matchAll(/var\(--([\w-]+),\s*([\s\S]*?)\);/g)]
    .map(([, name, fallback]) => [name, fallback.replace(/\s+/g, " ").trim()] as const)
    .filter(([name]) => THEMES.light[name]?.includes("oklch("))
    .filter(([name, fallback]) => fallback !== THEMES.light[name])
    .map(([name, fallback]) => `--${name}: ${fallback} ≠ ${THEMES.light[name]}`);
  expect(drift).toEqual([]);
});
