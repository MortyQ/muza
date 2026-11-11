import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { nextTick } from "vue";

import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import VIcon from "../../src/components/base/VIcon.vue";
import { collectIcons, findLibraryIcons, muzakitIcons } from "../../vite/icons.js";

/**
 * The library's own icons are assembled by `muzakitIcons()` (`libs/ui/vite/icons.js`): embedded on
 * `vite build`, left to the Iconify API on `vite dev`. These checks pin both halves, and that the
 * library sticks to the one icon set the build knows how to embed.
 */

const SRC = resolve(__dirname, "../../src");

// Any other Iconify set. Lucide is the library's only one.
const OTHER_SET_PATTERN
  = /["'`](mdi|tabler|ph|heroicons|ri|carbon|material-symbols|fa6?-[a-z]+|bi|ic):[a-z0-9-]+/g;

const sourceFiles = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) return sourceFiles(path);
  return /\.(vue|ts)$/.test(name) ? [path] : [];
});

// Drives the plugin the way Vite does: configResolved, then resolveId → load.
type Hook = (...args: unknown[]) => unknown;
const loadVirtualModule = (command: "build" | "serve"): string => {
  const plugin = muzakitIcons();
  const hook = (name: string): Hook => {
    const value: unknown = Reflect.get(plugin, name);
    if (typeof value !== "function") throw new Error(`plugin has no ${name} hook`);
    return value as Hook;
  };
  hook("configResolved")({ command });
  const id = hook("resolveId")("virtual:muzakit-icons");
  const code = hook("load")(id);
  if (typeof code !== "string") throw new Error("virtual module did not load");
  return code;
};

describe("muzakitIcons()", () => {
  it("embeds every lucide icon the library references on a build", () => {
    const used = findLibraryIcons();
    const collection = collectIcons(used);
    const embedded = new Set([
      ...Object.keys(collection.icons),
      ...Object.keys(collection.aliases ?? {}),
    ]);

    expect(used.length).toBeGreaterThan(0);
    expect(used.filter(name => !embedded.has(name))).toEqual([]);
    expect(loadVirtualModule("build")).toContain("\"prefix\":\"lucide\"");
  });

  it("leaves development to the Iconify API", () => {
    expect(loadVirtualModule("serve")).toBe("export default null;");
  });

  it("fails the build on a name lucide does not have", () => {
    expect(() => collectIcons(["no-such-icon"])).toThrow("no-such-icon");
  });

  it("finds icons in .vue and .ts sources alike", () => {
    const used = findLibraryIcons();
    expect(used).toContain("loader-circle"); // VIcon.vue
    expect(used).toContain("file-spreadsheet"); // DragNDrop.vue's lookup table
  });
});

describe("the library's icon set", () => {
  it("uses lucide only", () => {
    const foreign = sourceFiles(SRC).flatMap(file =>
      [...readFileSync(file, "utf8").matchAll(OTHER_SET_PATTERN)]
        .map(match => `${match[0].slice(1)} (${relative(SRC, file)})`));
    expect(foreign).toEqual([]);
  });
});

describe("VIcon with the build's icon set", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Vitest runs the plugin with `bundle: true`, so this is what a built app does. @iconify/vue
  // renders an empty <svg> until mounted (SSR safety), then fills it in the same tick from local
  // data — before the browser paints.
  it("draws a library icon as soon as it mounts, with no request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const wrapper = mount(VIcon, { props: { icon: "lucide:x" } });
    await nextTick();
    const svg = wrapper.find("svg");

    expect(svg.exists()).toBe(true);
    expect(svg.element.innerHTML).toContain("<path");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
