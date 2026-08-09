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
const CATEGORIES = ["base", "feedback", "inputs", "layout", "overlay"] as const;

interface ComponentFile {
  name: string
  category: string
  path: string
  source: string
  scssPath: string
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

    it.runIf(expectsScss)("has a scoped block that contains nothing but the import", () => {
      const body = (scoped[0]?.body ?? "").trim();
      const withoutImports = body.replace(/@import\s+"[^"]+";?/g, "").trim();
      expect(withoutImports, `${name} has rules inline instead of in its .scss`).toBe("");
    });

    it("is exported from index.ts", () => {
      expect(INDEX).toContain(`${name}.vue`);
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
