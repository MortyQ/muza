import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const LIB_ROOT = resolve(__dirname, "../..");

const readPackage = (): { sideEffects: string[] } =>
  JSON.parse(readFileSync(resolve(LIB_ROOT, "package.json"), "utf8"));

/**
 * The entry point is the only module that imports `tokens.css`, and an app's components are
 * reached through it by re-export. Under `sideEffects`, Rollup follows a re-export straight to the
 * component and drops the entry module itself, taking that import with it: every `--ui-*` token
 * vanished from the production build while dev, which does not tree-shake, looked fine.
 */
describe("@muzakit/ui package side effects", () => {
  it("keeps the entry point, which loads the tokens, out of tree-shaking", () => {
    expect(readPackage().sideEffects).toContain("./src/index.ts");
  });

  it("loads the tokens from that entry point", () => {
    const entry = readFileSync(resolve(LIB_ROOT, "src/index.ts"), "utf8");
    expect(entry).toMatch(/^import "\.\/styles\/tokens\.css";$/m);
  });
});
