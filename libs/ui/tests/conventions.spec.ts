import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The migration checklist in `.agents/instructions/ui-component-migration.md`,
 * expressed as assertions.
 *
 * A convention nobody enforces decays into a suggestion: before this file
 * existed, four components had drifted back to Tailwind utilities and three had
 * grown unscoped style blocks, none of it visible to the compiler or to eslint.
 */

const SRC = resolve(__dirname, "../src");
const UNIT = resolve(__dirname, "unit");
const CATEGORIES = ["base", "feedback", "inputs", "layout", "overlay"] as const;

interface ComponentFile {
  name: string
  category: string
  path: string
  source: string
  scssPath: string
  specPath: string
}

function collect(): ComponentFile[] {
  return CATEGORIES.flatMap((category) => {
    const dir = join(SRC, "components", category);
    return readdirSync(dir)
      .filter(f => f.endsWith(".vue"))
      .map((file) => {
        const name = file.replace(/\.vue$/, "");
        return {
          name,
          category,
          path: join(dir, file),
          source: readFileSync(join(dir, file), "utf8"),
          scssPath: join(SRC, "styles/components", category, `${name.toLowerCase()}.scss`),
          specPath: join(UNIT, category, `${name}.spec.ts`),
        };
      });
  });
}

const COMPONENTS = collect();
const INDEX = readFileSync(join(SRC, "index.ts"), "utf8");
const GLOBALS = readFileSync(join(SRC, "global-components.d.ts"), "utf8");

/**
 * VIcon keeps its rules inline: four structural declarations and a keyframe,
 * not a token in sight. A separate file for that costs more than it explains.
 * Every other component has a paired stylesheet and must keep it.
 */
const NO_EXTERNAL_SCSS = new Set(["VIcon"]);

/**
 * A second, unscoped block is allowed only where the styled element is
 * teleported out of the component's subtree, which puts it beyond the reach of
 * Vue's scope attribute. The block must say so — the marker is what makes this
 * an argued exception rather than a silent one.
 */
const TELEPORT_MARKER = /teleported:/;

/**
 * Components deliberately left to the token and screenshot layers, with no
 * unit spec of their own. An entry here is an argument, not an oversight —
 * and the "has no stale entries" test below deletes the argument the moment
 * the spec appears.
 */
const NO_UNIT_SPEC = new Set<string>([]);

function templateOf(source: string): string {
  const match = source.match(/<template>([\s\S]*)<\/template>/);
  return match?.[1] ?? "";
}

function styleBlocks(source: string): { attrs: string, body: string }[] {
  return [...source.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)].map(m => ({
    attrs: m[1],
    body: m[2],
  }));
}

describe("component conventions", () => {
  it("finds every component", () => {
    expect(COMPONENTS.length).toBeGreaterThan(25);
  });

  describe.each(COMPONENTS)("$category/$name", (component) => {
    const { name, source, scssPath } = component;
    const template = templateOf(source);
    const blocks = styleBlocks(source);
    const scoped = blocks.filter(b => b.attrs.includes("scoped"));
    const unscoped = blocks.filter(b => !b.attrs.includes("scoped") && !b.attrs.includes("src="));

    it("has exactly one scoped style block", () => {
      expect(scoped).toHaveLength(1);
    });

    it("declares any unscoped block as a teleport exception", () => {
      for (const block of unscoped) {
        const index = source.indexOf(block.body);
        const preamble = source.slice(Math.max(0, index - 400), index);
        expect(
          TELEPORT_MARKER.test(preamble) || TELEPORT_MARKER.test(block.body),
          `${name} has an unscoped <style> without a "teleported:" justification`,
        ).toBe(true);
      }
    });

    it("carries no Tailwind utility classes in the template", () => {
      const utility = new RegExp(
        String.raw`class="[^"]*\b(?:`
        + [
          "inline-flex", "flex", "grid", "hidden", "block", "absolute", "relative", "fixed",
          "items-[a-z]+", "justify-[a-z]+", "self-[a-z]+",
          "gap-[\\d.]+", "space-[xy]-[\\d.]+",
          "[pm][xytblr]?-[\\d.]+",
          "w-[\\w./]+", "h-[\\w./]+", "min-[wh]-[\\w./]+", "max-[wh]-[\\w./]+",
          "text-(?:xs|sm|base|lg|xl|left|center|right)",
          // Colour utilities named after a design token. Easy to miss by eye
          // and by a size-oriented pattern: `text-danger` sat in VInput's
          // template for a whole phase before this line existed.
          "(?:text|bg|border|fill|stroke|ring|from|via|to|decoration|outline|caret|accent|divide|placeholder)"
          + "-(?:primary|danger|success|warning|info|foreground|surface|background|border|nav|scrim"
          + "|overlay|muted|secondary|subtle|inverted|accent|input|badge|ring)[\\w./-]*",
          "font-(?:thin|light|normal|medium|semibold|bold)",
          "rounded(?:-[\\w]+)?", "border(?:-[\\w./]+)?", "shadow(?:-[\\w]+)?",
          "bg-[\\w./\\[\\]-]+", "z-\\d+", "overflow-[a-z]+", "truncate",
          "opacity-\\d+", "cursor-[a-z]+", "pointer-events-[a-z]+",
        ].join("|")
        + String.raw`)\b`,
        "g",
      );
      const hits = template.match(utility) ?? [];
      expect(hits, `${name} template still uses Tailwind utilities: ${hits.join(", ")}`)
        .toHaveLength(0);
    });

    it("keeps inline :style for custom properties only", () => {
      // `:style="{ '--x': v }"` is the sanctioned way to hand a dynamic value
      // to CSS. Anything else is a hardcoded declaration in the template.
      const inline = [...template.matchAll(/:style="\{([^}]*)\}"/g)].map(m => m[1]);
      for (const decl of inline) {
        expect(decl.includes("--"), `${name} has an inline :style that is not a custom property: ${decl}`)
          .toBe(true);
      }
    });

    const expectsScss = !NO_EXTERNAL_SCSS.has(name);

    it.runIf(expectsScss)("imports its stylesheet from the conventional path", () => {
      expect(existsSync(scssPath), `expected ${scssPath} to exist`).toBe(true);
      expect(scoped[0]?.body ?? "").toContain(`${name.toLowerCase()}.scss`);
    });

    it.runIf(expectsScss)("has a scoped block that contains nothing but the load", () => {
      const body = (scoped[0]?.body ?? "").trim();
      const withoutLoads = body.replace(/@(?:use|import)\s+"[^"]+";?/g, "").trim();
      expect(withoutLoads, `${name} has rules inline instead of in its .scss`).toBe("");
    });

    it("uses @use, not @import, in any block marked lang=\"scss\"", () => {
      // Without `lang`, the `@import` is a CSS import that postcss resolves and
      // Dart Sass never sees. With `lang="scss"` the same line goes through
      // Sass, which deprecates `@import` and will drop it in 3.0 — so it prints
      // a warning on every dev-server start. `@use` compiles to the same CSS.
      for (const block of blocks) {
        if (!block.attrs.includes("lang=\"scss\"")) continue;
        expect(
          block.body.includes("@import"),
          `${name} has a lang="scss" block using @import; use @use instead`,
        ).toBe(false);
      }
    });

    it("is exported from index.ts", () => {
      expect(INDEX).toContain(`${name}.vue`);
    });

    it.runIf(!NO_UNIT_SPEC.has(name))("has a unit spec at the conventional path", () => {
      // The whole point of a guard rather than a checklist: a component can
      // land without tests only by writing itself into NO_UNIT_SPEC, where
      // the omission is readable. Backfilling "later" does not survive
      // contact with a deadline; a red test does.
      expect(
        existsSync(component.specPath),
        `${name} has no unit spec — expected ${component.specPath}, or an entry in NO_UNIT_SPEC`,
      ).toBe(true);
    });
  });

  it("keeps no stale entries in NO_UNIT_SPEC", () => {
    const stale = COMPONENTS
      .filter(c => NO_UNIT_SPEC.has(c.name) && existsSync(c.specPath))
      .map(c => c.name);
    expect(stale, `these now have a spec and must leave NO_UNIT_SPEC: ${stale.join(", ")}`)
      .toHaveLength(0);
  });
});

/**
 * `navigation-sidebar/` is outside CATEGORIES — it owns a nested structure and
 * a partial stylesheet set, so the style rules above do not apply to it. The
 * spec rule does, and it applies to every unit in the folder without exception.
 *
 * There was a SIDEBAR_UNTESTED list here naming the eighteen units that had no
 * spec. It is gone because it reached zero, which is the only way it was ever
 * meant to end. Do not reintroduce it: a new file in this folder gets a spec.
 */
describe("navigation-sidebar specs", () => {
  const ROOT = join(SRC, "components/navigation-sidebar");

  const units = readdirSync(ROOT, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .filter(entry => /\.(vue|ts)$/.test(entry.name))
    // Barrels, type modules and injection keys hold no behaviour to test.
    .filter(entry => !/^(index|injectionKeys|routeMeta)\./.test(entry.name))
    .filter(entry => !entry.parentPath.includes("/types"))
    .map(entry => ({
      name: entry.name.replace(/\.(vue|ts)$/, ""),
      specPath: join(UNIT, "navigation-sidebar", `${entry.name.replace(/\.(vue|ts)$/, "")}.spec.ts`),
    }));

  it("finds the units", () => {
    expect(units.length).toBeGreaterThan(15);
  });

  describe.each(units)("$name", ({ name, specPath }) => {
    it("has a unit spec", () => {
      expect(
        existsSync(specPath),
        `${name} has no unit spec — expected ${specPath}`,
      ).toBe(true);
    });
  });
});

describe("stylesheet conventions", () => {
  const SHEETS = CATEGORIES.flatMap((category) => {
    const dir = join(SRC, "styles/components", category);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter(f => f.endsWith(".scss"))
      .map(file => ({ file: `${category}/${file}`, source: readFileSync(join(dir, file), "utf8") }));
  });

  it("finds the stylesheets", () => {
    expect(SHEETS.length).toBeGreaterThan(20);
  });

  describe.each(SHEETS)("$file", ({ file, source }) => {
    // Comments legitimately mention the banned forms while explaining a port.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

    it("uses no raw colour values", () => {
      const raw = [
        ...code.matchAll(/#[0-9a-fA-F]{3,8}\b/g),
        ...code.matchAll(/\brgba?\(/g),
        // oklch() is allowed only as a var() fallback, which lives in tokens.css.
        ...code.matchAll(/\boklch\(/g),
      ].map(m => m[0]);
      expect(raw, `${file} hardcodes colours: ${raw.join(", ")}`).toHaveLength(0);
    });

    it("uses no Tailwind escape hatches", () => {
      expect(code).not.toMatch(/@apply\b/);
      expect(code).not.toMatch(/\btheme\(/);
    });

    it("mixes alpha in oklch", () => {
      const wrongSpace = [...code.matchAll(/color-mix\(\s*in\s+(?!oklch)([a-z-]+)/g)].map(m => m[1]);
      expect(wrongSpace, `${file} uses color-mix in ${wrongSpace.join(", ")} instead of oklch`)
        .toHaveLength(0);
    });
  });
});

// Every stylesheet in the library, the table's partials and the sidebar's
// included, plus the style blocks inside .vue files — a literal value is the
// same defect wherever it lives. `raw` keeps comments, for the guards that read
// a `/* literal: … */` marker; `code` has them stripped.
const walkStyles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walkStyles(path);
    return /\.(scss|vue)$/.test(entry.name) ? [path] : [];
  });

const STYLE_FILES = walkStyles(SRC).map((path) => {
  const source = readFileSync(path, "utf8");
  const raw = path.endsWith(".vue")
    ? [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n")
    : source;
  return {
    file: path.slice(SRC.length + 1),
    raw,
    code: raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""),
  };
});

/**
 * Declarations of `property` whose value holds a literal length, skipping lines
 * that carry a `/* literal: <reason> *\/` marker — a size or a geometry coupling
 * that only looks like spacing, argued in place.
 */
const literalLengths = (
  raw: string,
  property: RegExp,
  allowed: (value: string) => boolean,
): string[] => {
  const length = /(?:^|[\s(,])(-?(?:\d+\.?\d*|\.\d+)(?:px|rem|em))\b/g;
  const declaration = new RegExp(`(?:^|[{;\\s])(${property.source})\\s*:\\s*([^;{}]+);`, "g");
  return raw.split("\n")
    .filter(line => !line.includes("/* literal:"))
    .map(line => line.replace(/\/\/.*$/, "").replace(/\/\*[\s\S]*?\*\//g, ""))
    .flatMap(line => [...line.matchAll(declaration)]
      .filter(([, , value]) => [...value.matchAll(length)].some(m => !allowed(m[1])))
      .map(([, name, value]) => `${name}: ${value.trim()}`));
};

describe("type values", () => {
  const FILES = STYLE_FILES;

  it("finds the files", () => {
    expect(FILES.length).toBeGreaterThan(80);
  });

  it.each(FILES)("$file sets font-size and font-weight from tokens", ({ file, code }) => {
    const literals = [
      ...code.matchAll(/font-size:\s*[\d.]+(?:px|rem|em)\b/g),
      ...code.matchAll(/font-weight:\s*\d{3}\b/g),
      ...code.matchAll(/\$[\w-]*font-weight[\w-]*:\s*\d{3}\b/g),
    ].map(m => m[0]);
    expect(literals, `${file} hardcodes type: ${literals.join(", ")} — use --ui-text-* / --ui-weight-*`)
      .toHaveLength(0);
  });

  it.each(FILES)("$file sets letter-spacing from the tracking tokens", ({ file, code }) => {
    const literals = [...code.matchAll(/letter-spacing:\s*(-?[\d.]+(?:px|rem|em))/g)]
      .map(m => m[0])
      .filter(value => !/:\s*-?0(?:px|rem|em)?$/.test(value));
    expect(literals, `${file} hardcodes tracking: ${literals.join(", ")} — use --ui-tracking-*`)
      .toHaveLength(0);
  });

  // The display size is for headline figures, and only VStat draws one. The
  // skeleton mirrors it so a loading figure takes the same line box.
  const DISPLAY_SIZE = new Set([
    "styles/components/base/vstat.scss",
    "styles/components/feedback/vskeleton.scss",
  ]);

  it.each(FILES)("$file keeps the display size for headline figures", ({ file, code }) => {
    if (DISPLAY_SIZE.has(file)) return;
    expect(code, `${file} uses --ui-text-display, which only VStat and VSkeleton may`)
      .not.toMatch(/--ui-(?:text|leading)-display\b/);
  });
});

describe("spacing values", () => {
  // A 4px grid with 2px and 6px as the only half steps, all of it in
  // --ui-space-*. Zero and ±1px border compensation are the only literals.
  const SPACING = /gap|row-gap|column-gap|padding(?:-[a-z-]+)?|margin(?:-[a-z-]+)?/;
  const isAllowed = (value: string) => /^-?0(?:px|rem|em)?$/.test(value) || /^-?1px$/.test(value);

  it.each(STYLE_FILES)("$file takes gap, padding and margin from tokens", ({ file, raw }) => {
    const literals = literalLengths(raw, SPACING, isAllowed);
    expect(literals, `${file} hardcodes spacing: ${literals.join("; ")} — use --ui-space-*, or mark a size with /* literal: <reason> */`)
      .toHaveLength(0);
  });
});

describe("shadow values", () => {
  // Two elevations: --ui-shadow-sm for resting cards, --ui-shadow-lg for what
  // floats. A ring or an inset line (no blur) is not an elevation and may be
  // written out; a blurred shadow written out, or any other --ui-shadow-*, fails.
  const splitLayers = (value: string): string[] => {
    const layers: string[] = [];
    let depth = 0;
    let current = "";
    for (const char of value) {
      if (char === "(") depth++;
      if (char === ")") depth--;
      if (char === "," && depth === 0) {
        layers.push(current.trim());
        current = "";
      }
      else current += char;
    }
    return [...layers, current.trim()];
  };

  const isElevation = (layer: string): boolean => {
    const token = layer.match(/var\(--ui-shadow-([\w-]+)\)/);
    if (token) return !["sm", "lg"].includes(token[1]);
    // Drop colour functions and keywords; what is left are the lengths.
    const lengths = layer.replace(/[a-z-]+\([^()]*(?:\([^()]*\)[^()]*)*\)/g, "")
      .split(/\s+/).filter(part => part && part !== "inset" && part !== "none");
    const blur = lengths[2];
    return blur !== undefined && !/^-?0(?:px)?$/.test(blur);
  };

  it.each(STYLE_FILES)("$file elevates only through --ui-shadow-sm / -lg", ({ file, raw }) => {
    const offenders = [...raw.replace(/\/\/[^\n]*/g, "").matchAll(/box-shadow\s*:\s*([^;{}]+);([^\n]*)/g)]
      .filter(([, , rest]) => !rest.includes("/* literal:"))
      .map(([, value]) => value.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim())
      .filter(value => splitLayers(value).some(isElevation));
    expect(offenders, `${file} draws an elevation outside the two levels: ${offenders.join("; ")}`)
      .toHaveLength(0);
  });
});

describe("radius values", () => {
  // Radii come from --ui-radius-*. A nested corner is `calc(<outer> - <padding>)`
  // over tokens, so it follows outer = inner + padding by construction.
  const RADIUS = /border(?:-[a-z-]+)?-radius|\$[\w-]*radius[\w-]*|--[\w-]*radius[\w-]*/;

  // 1–2px corners on marks too small to carry a scale step, by file.
  const HAIRLINE_RADII = new Set([
    "styles/components/base/vbutton.scss", // the focus inset's corner
    "styles/components/inputs/vcheckbox.scss", // the tick and the dash
    "styles/components/layout/vcard.scss", // the accent bar
    "styles/components/navigation-sidebar/_sidebar-nav.scss", // the active bar
    "components/table/assets/styles/_header.scss", // the resize divider
    "components/table/assets/styles/_wrapper.scss", // inner corner, 1px border
    "components/table/assets/styles/column-picker.scss", // the selection bar
  ]);

  it.each(STYLE_FILES)("$file takes its radii from tokens", ({ file, raw }) => {
    const isAllowed = (value: string) =>
      /^0(?:px|rem)?$/.test(value)
      || (HAIRLINE_RADII.has(file) && /^(?:1px|2px|0\.125rem)$/.test(value));
    const literals = literalLengths(raw, RADIUS, isAllowed);
    expect(literals, `${file} hardcodes a radius: ${literals.join("; ")} — use --ui-radius-*`)
      .toHaveLength(0);
  });

  it("keeps no stale entries in HAIRLINE_RADII", () => {
    const files = new Set(STYLE_FILES.map(({ file }) => file));
    expect([...HAIRLINE_RADII].filter(file => !files.has(file))).toEqual([]);
  });
});

describe("global component registration", () => {
  it("declares every globally registered component with a matching import path", () => {
    const declared = [...GLOBALS.matchAll(/(\w+): typeof import\("([^"]+)"\)/g)];
    expect(declared.length).toBeGreaterThan(20);

    for (const [, name, path] of declared) {
      const file = resolve(SRC, `${path.replace(/^\.\//, "")}`);
      expect(existsSync(file), `${name} points at a missing file: ${path}`).toBe(true);
    }
  });

  it("keeps the load-bearing `export {}` that makes the file a module", () => {
    // Without it `declare module "vue"` replaces Vue's types instead of
    // augmenting them, and every `computed`/`ref` import in the library breaks.
    expect(GLOBALS).toMatch(/^export\s*\{\s*\};?\s*$/m);
  });
});
