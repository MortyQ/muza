import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { nextTick } from "vue";

import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import VIcon from "../../src/components/base/VIcon.vue";
import libraryIcons from "../../src/icons/library-icons.json";

/**
 * The library ships the lucide icons its own components draw (`src/icons/library-icons.json`,
 * written by `pnpm --filter @muzakit/ui icons`), so they never depend on the public Iconify API.
 * These checks keep that file in step with the components: a new icon in a template without a
 * re-run of the script would otherwise render as an empty box offline and fetch online.
 */

const SRC = resolve(__dirname, "../../src");
const REGENERATE = "run `pnpm --filter @muzakit/ui icons`";

// The generator's pattern: the scan and this check must agree on what "used" means.
const ICON_PATTERN = /lucide:([a-z0-9]+(?:-[a-z0-9]+)*)/g;
// Any other Iconify set. Lucide is the library's only one.
const OTHER_SET_PATTERN
  = /["'`](mdi|tabler|ph|heroicons|ri|carbon|material-symbols|fa6?-[a-z]+|bi|ic):[a-z0-9-]+/g;

const sourceFiles = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) return sourceFiles(path);
  return /\.(vue|ts)$/.test(name) ? [path] : [];
});

const usedIcons = (): Map<string, string> => {
  const used = new Map<string, string>();
  for (const file of sourceFiles(SRC)) {
    for (const match of readFileSync(file, "utf8").matchAll(ICON_PATTERN)) {
      if (match[1] && !used.has(match[1])) used.set(match[1], relative(SRC, file));
    }
  }
  return used;
};

const aliases: Record<string, { parent: string }> = "aliases" in libraryIcons
  ? libraryIcons.aliases
  : {};
const bundled = new Set([...Object.keys(libraryIcons.icons), ...Object.keys(aliases)]);

describe("the library's icon set", () => {
  it("bundles every lucide icon a component uses", () => {
    const missing = [...usedIcons()]
      .filter(([name]) => !bundled.has(name))
      .map(([name, file]) => `lucide:${name} (${file})`);
    expect(missing, `not bundled — ${REGENERATE}`).toEqual([]);
  });

  it("bundles nothing no component uses", () => {
    const used = usedIcons();
    const parents = new Set([...used.keys()].map(name => aliases[name]?.parent ?? name));
    const stale = [...bundled].filter(name => !used.has(name) && !parents.has(name));
    expect(stale, `stale entries — ${REGENERATE}`).toEqual([]);
  });

  it("uses lucide only", () => {
    const foreign = sourceFiles(SRC).flatMap(file =>
      [...readFileSync(file, "utf8").matchAll(OTHER_SET_PATTERN)]
        .map(match => `${match[0].slice(1)} (${relative(SRC, file)})`));
    expect(foreign).toEqual([]);
  });
});

describe("VIcon with a bundled icon", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // @iconify/vue renders an empty <svg> until it is mounted (SSR safety), then fills it in the
  // same tick from local data — before the browser paints. Without local data it would wait on a
  // request instead, which is what this guards.
  it("draws the glyph as soon as it mounts, with no request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const wrapper = mount(VIcon, { props: { icon: "lucide:x" } });
    await nextTick();
    const svg = wrapper.find("svg");

    expect(svg.exists()).toBe(true);
    expect(svg.element.innerHTML).toContain("<path");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
