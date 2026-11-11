import type { IconifyJSON } from "@iconify/vue";
import type { Plugin } from "vite";

export declare const ICON_PATTERN: RegExp;

/** Every lucide icon name referenced under `srcDir` (default: libs/ui/src). */
export declare const findLibraryIcons: (srcDir?: string) => string[];

/** The Iconify collection holding exactly `names`; throws on a name lucide does not have. */
export declare const collectIcons: (names: ReadonlyArray<string>) => IconifyJSON;

/**
 * Provides `virtual:muzakit-icons`: the library's own icons on `vite build`, `null` on `vite dev`.
 * `bundle` overrides that default (Vitest passes `true`).
 */
export declare const muzakitIcons: (options?: { bundle?: boolean }) => Plugin;
