// Writes the lucide icons the library itself references into src/icons/library-icons.json, so
// they render offline, under a strict CSP, and on the first frame instead of after a fetch from
// the public Iconify API. Run it whenever a component starts using a new icon:
//
//   pnpm --filter @muzakit/ui icons
//
// tests/unit/icons.spec.ts fails until it has been run.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { icons as lucide } from "@iconify-json/lucide";

const root = fileURLToPath(new URL("..", import.meta.url));
const srcDir = join(root, "src");
const outFile = join(srcDir, "icons", "library-icons.json");

// Shared with tests/unit/icons.spec.ts: the scan and the check must agree on what "used" means.
const ICON_PATTERN = /lucide:([a-z0-9]+(?:-[a-z0-9]+)*)/g;

const walk = dir => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) return walk(path);
  return /\.(vue|ts)$/.test(name) ? [path] : [];
});

const used = new Set();
for (const file of walk(srcDir)) {
  for (const match of readFileSync(file, "utf8").matchAll(ICON_PATTERN)) used.add(match[1]);
}

const subset = { prefix: lucide.prefix, width: lucide.width, height: lucide.height, icons: {} };
const aliases = {};
const missing = [];

for (const name of [...used].sort()) {
  if (lucide.icons[name]) {
    subset.icons[name] = lucide.icons[name];
    continue;
  }
  const alias = lucide.aliases?.[name];
  if (alias && lucide.icons[alias.parent]) {
    aliases[name] = alias;
    subset.icons[alias.parent] = lucide.icons[alias.parent];
    continue;
  }
  missing.push(name);
}

if (missing.length > 0) {
  throw new Error(`Not in @iconify-json/lucide: ${missing.join(", ")}`);
}
if (Object.keys(aliases).length > 0) subset.aliases = aliases;

writeFileSync(outFile, `${JSON.stringify(subset, null, 2)}\n`);
console.log(`${used.size} icons → ${relative(root, outFile)}`);
