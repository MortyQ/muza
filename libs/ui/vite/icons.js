// Build-time icons for @muzakit/ui.
//
// The library's components draw lucide icons through VIcon, which reads its own icon set from the
// virtual module `virtual:muzakit-icons`. This plugin provides that module:
//
// - `vite build` — the lucide icons referenced anywhere in libs/ui/src, extracted from
//   @iconify-json/lucide, so a deployed app never fetches them from the Iconify API;
// - `vite dev` — `null`, so development starts with nothing to scan or generate and the icons
//   load from the API as they always did.
//
// Every Vite config that compiles the library from source registers it: libs/ui (its own dist
// build and Vitest), and each app. A config without it fails on the unresolved import.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { icons as lucide } from "@iconify-json/lucide";

const VIRTUAL_ID = "virtual:muzakit-icons";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
// From the string, not `new URL()`: under jsdom (Vitest's unit project) the global URL is
// jsdom's, which Node's fileURLToPath rejects.
const LIBRARY_SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

export const ICON_PATTERN = /lucide:([a-z0-9]+(?:-[a-z0-9]+)*)/g;

const sourceFiles = dir => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) return sourceFiles(path);
  return /\.(vue|ts)$/.test(name) ? [path] : [];
});

/** Every lucide icon name referenced under `srcDir`. */
export const findLibraryIcons = (srcDir = LIBRARY_SRC) => {
  const used = new Set();
  for (const file of sourceFiles(srcDir)) {
    for (const match of readFileSync(file, "utf8").matchAll(ICON_PATTERN)) used.add(match[1]);
  }
  return [...used].sort();
};

/** The Iconify collection holding exactly `names`; throws on a name lucide does not have. */
export const collectIcons = (names) => {
  const { prefix, width, height } = lucide;
  const collection = { prefix, width, height, icons: {} };
  const aliases = {};
  const missing = [];

  for (const name of names) {
    const alias = lucide.aliases?.[name];
    if (lucide.icons[name]) {
      collection.icons[name] = lucide.icons[name];
    }
    else if (alias && lucide.icons[alias.parent]) {
      aliases[name] = alias;
      collection.icons[alias.parent] = lucide.icons[alias.parent];
    }
    else {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    throw new Error(`[muzakit-icons] not in @iconify-json/lucide: ${missing.join(", ")}`);
  }
  if (Object.keys(aliases).length > 0) collection.aliases = aliases;
  return collection;
};

/** @param {{ bundle?: boolean }} [options] `bundle` overrides the build/dev default. */
export const muzakitIcons = (options = {}) => {
  let bundle = options.bundle ?? false;

  return {
    name: "muzakit-icons",
    configResolved(config) {
      bundle = options.bundle ?? config.command === "build";
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      const collection = bundle ? collectIcons(findLibraryIcons()) : null;
      return `export default ${JSON.stringify(collection)};`;
    },
  };
};
